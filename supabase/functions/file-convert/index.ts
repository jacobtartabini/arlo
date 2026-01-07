/**
 * File Conversion Edge Function for Arlo
 * Handles Office document conversions via CloudConvert API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyArloAuth, corsHeaders } from "../_shared/arloAuth.ts";

const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY");
const CLOUDCONVERT_API_URL = "https://api.cloudconvert.com/v2";

interface ConvertRequest {
  outputFormat: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    // Verify authentication
    const authResult = await verifyArloAuth(req);
    if (!authResult.isValid || !authResult.userKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (!CLOUDCONVERT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CloudConvert API not configured" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const outputFormat = formData.get("outputFormat") as string | null;

    if (!file || !outputFormat) {
      return new Response(
        JSON.stringify({ error: "Missing file or outputFormat" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large (max 100MB)" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Determine input format from file name
    const ext = file.name.split('.').pop()?.toLowerCase();
    const inputFormatMap: Record<string, string> = {
      docx: 'docx',
      doc: 'doc',
      xlsx: 'xlsx',
      xls: 'xls',
      pptx: 'pptx',
      ppt: 'ppt',
    };
    
    const inputFormat = inputFormatMap[ext || ''];
    if (!inputFormat) {
      return new Response(
        JSON.stringify({ error: "Unsupported file format for server-side conversion" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create a job with CloudConvert
    const jobResponse = await fetch(`${CLOUDCONVERT_API_URL}/jobs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-file": {
            operation: "import/upload",
          },
          "convert-file": {
            operation: "convert",
            input: ["import-file"],
            input_format: inputFormat,
            output_format: outputFormat,
          },
          "export-file": {
            operation: "export/url",
            input: ["convert-file"],
            inline: false,
            archive_multiple_files: false,
          },
        },
        tag: `arlo-${authResult.userKey}`,
      }),
    });

    if (!jobResponse.ok) {
      const error = await jobResponse.text();
      console.error("CloudConvert job creation failed:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create conversion job" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const job = await jobResponse.json();
    const importTask = job.data.tasks.find((t: { name: string }) => t.name === "import-file");
    
    if (!importTask?.result?.form) {
      return new Response(
        JSON.stringify({ error: "Failed to get upload URL" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upload file to CloudConvert
    const uploadForm = new FormData();
    for (const [key, value] of Object.entries(importTask.result.form.parameters)) {
      uploadForm.append(key, value as string);
    }
    uploadForm.append("file", file);

    const uploadResponse = await fetch(importTask.result.form.url, {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error("CloudConvert upload failed:", error);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Step 3: Wait for job completion (poll)
    const jobId = job.data.id;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`${CLOUDCONVERT_API_URL}/jobs/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`,
        },
      });

      const statusData = await statusResponse.json();
      const status = statusData.data.status;

      if (status === "finished") {
        const exportTask = statusData.data.tasks.find(
          (t: { name: string }) => t.name === "export-file"
        );
        
        if (exportTask?.result?.files?.[0]?.url) {
          return new Response(
            JSON.stringify({
              success: true,
              downloadUrl: exportTask.result.files[0].url,
              fileName: exportTask.result.files[0].filename,
            }),
            { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
          );
        }
      }

      if (status === "error") {
        const errorTask = statusData.data.tasks.find((t: { status: string }) => t.status === "error");
        console.error("CloudConvert conversion error:", errorTask?.message);
        return new Response(
          JSON.stringify({ error: errorTask?.message || "Conversion failed" }),
          { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      attempts++;
    }

    return new Response(
      JSON.stringify({ error: "Conversion timed out" }),
      { status: 504, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("File conversion error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
