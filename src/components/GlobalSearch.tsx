import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command";
import {
  APP_MODULES,
  APP_PAGES,
  APP_RESOURCES,
  type Module,
  type NavigationItem
} from "@/lib/app-navigation";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: Module["icon"] | NavigationItem["icon"];
  value: string;
}

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTextInput = activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable);

      if (isTextInput && !event.metaKey && !event.ctrlKey) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const toResult = useCallback(
    (item: Module | NavigationItem, subtitle: string): SearchResult => ({
      id: item.id,
      title: item.title,
      subtitle,
      route: item.route,
      icon: item.icon,
      value: `${item.title} ${subtitle} ${(item.keywords ?? []).join(" ")}`
    }),
    []
  );

  const moduleResults = useMemo(() => APP_MODULES.map((module) => toResult(module, module.summary ?? "Module workspace")), [toResult]);
  const pageResults = useMemo(() => APP_PAGES.map((page) => toResult(page, page.description)), [toResult]);
  const resourceResults = useMemo(
    () => APP_RESOURCES.map((resource) => toResult(resource, resource.description)),
    [toResult]
  );

  const handleSelect = useCallback(
    (route: string) => {
      setOpen(false);
      navigate(route);
    },
    [navigate]
  );

  const renderResult = useCallback(
    (result: SearchResult) => {
      const Icon = result.icon;
      return (
        <CommandItem key={result.id} value={result.value} onSelect={() => handleSelect(result.route)}>
          <Icon className="mr-3 h-5 w-5 text-primary" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{result.title}</span>
            <span className="text-xs text-muted-foreground">{result.subtitle}</span>
          </div>
          <CommandShortcut>↵</CommandShortcut>
        </CommandItem>
      );
    },
    [handleSelect]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen} label="Global search">
      <CommandInput placeholder="Search pages, modules, and resources..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick navigation">
          {pageResults.map((result) => renderResult(result))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Modules">
          {moduleResults.map((result) => renderResult(result))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Resources & data">
          {resourceResults.map((result) => renderResult(result))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;
