import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Module } from "./BentoGrid";
import { ArrowRight, TrendingUp, TrendingDown, Plus, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ModuleTileProps {
  module: Module;
  onClick: () => void;
}

export function ModuleTile({ module, onClick }: ModuleTileProps) {
  const Icon = module.icon;

  // Render different content based on module type
  const renderModuleContent = () => {
    switch (module.id) {
      case "habits":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  {/* Progress ring */}
                  <svg className="w-12 h-12 -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="hsl(var(--primary) / 0.1)"
                      strokeWidth="3"
                      fill="none"
                    />
                    <motion.circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "0 125.6" }}
                      animate={{ strokeDasharray: "94.2 125.6" }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                    5
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">5 active</p>
                  <p className="text-xs text-muted-foreground">3 day streak 🔥</p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs hover:bg-primary/5"
              onClick={(e) => { e.stopPropagation(); }}
            >
              <Plus className="w-3 h-3 mr-2" />
              Add habit
            </Button>
          </div>
        );

      case "budget":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-bold text-foreground">$2,340</p>
              <p className="text-xs text-muted-foreground">Remaining this month</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Spent</span>
                <span className="text-foreground font-medium">$1,660 / $4,000</span>
              </div>
              <Progress value={41.5} className="h-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2 text-xs">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-muted-foreground">$420 today</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-muted-foreground">12% saved</span>
              </div>
            </div>
          </div>
        );

      case "nutrition":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">1,800</p>
                <p className="text-xs text-muted-foreground">/ 2,200 cal</p>
              </div>
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="hsl(var(--primary) / 0.1)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <motion.circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 150.8" }}
                    animate={{ strokeDasharray: "123.2 150.8" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                  82%
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Protein</p>
                <p className="font-medium text-foreground">65g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Carbs</p>
                <p className="font-medium text-foreground">180g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fat</p>
                <p className="font-medium text-foreground">45g</p>
              </div>
            </div>
          </div>
        );

      case "automation":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Active automations</p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-500"
              />
            </div>
            <div className="space-y-2">
              {["Morning routine", "Email digest"].map((name, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Check className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-bold text-foreground">3 goals</p>
              <p className="text-xs text-muted-foreground">In progress</p>
            </div>
            <div className="space-y-3">
              {[
                { name: "Learn Spanish", progress: 65 },
                { name: "Run 5K", progress: 40 },
                { name: "Read 12 books", progress: 83 }
              ].map((goal, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{goal.name}</span>
                    <span className="text-muted-foreground">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-1" />
                </div>
              ))}
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-bold text-foreground">Analytics</p>
              <p className="text-xs text-muted-foreground">This week's insights</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Productivity</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs font-medium text-foreground">+23%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Focus time</span>
                <span className="text-xs font-medium text-foreground">18.5 hrs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tasks done</span>
                <span className="text-xs font-medium text-foreground">47</span>
              </div>
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-12 pt-2">
              {[40, 65, 45, 80, 55, 70, 85].map((height, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex-1 bg-primary/20 rounded-sm"
                />
              ))}
            </div>
          </div>
        );

      case "calendar":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-foreground">Today</p>
                <p className="text-xs text-muted-foreground">3 events</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { time: "9:00 AM", event: "Team standup" },
                { time: "2:00 PM", event: "Design review" },
                { time: "4:30 PM", event: "1:1 with Sarah" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{item.event}</p>
                    <p className="text-[10px] text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "journal":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-bold text-foreground">Journal</p>
              <p className="text-xs text-muted-foreground">Reflect on your day</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-muted-foreground">7 day streak</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-muted-foreground">42 entries this month</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs hover:bg-primary/5"
              onClick={(e) => { e.stopPropagation(); }}
            >
              Write today's entry
              <ChevronRight className="w-3 h-3 ml-auto" />
            </Button>
          </div>
        );

      case "wellness":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="text-2xl"
              >
                ❤️
              </motion.div>
              <div>
                <p className="text-xl font-bold text-foreground">72 bpm</p>
                <p className="text-xs text-muted-foreground">Resting heart rate</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Steps</p>
                <p className="font-medium text-foreground">8,432</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sleep</p>
                <p className="font-medium text-foreground">7.2 hrs</p>
              </div>
            </div>
          </div>
        );

      case "focus":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-bold text-foreground">Focus</p>
              <p className="text-xs text-muted-foreground">Deep work mode</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-foreground">2:45:00</p>
                <p className="text-xs text-muted-foreground">Total today</p>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary"
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-center text-xs hover:bg-primary/5"
              onClick={(e) => { e.stopPropagation(); }}
            >
              Start session
            </Button>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {module.summary}
          </p>
        );
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="h-full cursor-pointer group"
    >
      <Card className="glass-module h-full p-6 relative overflow-hidden">
        {/* Subtle accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(var(--${module.color})), transparent)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          <div className="space-y-3 mb-4">
            {/* Icon with subtle background */}
            <div className="w-11 h-11 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
              <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              {module.title}
            </h3>
          </div>
          
          {/* Rich widget content */}
          <div className="flex-1">
            {renderModuleContent()}
          </div>
          
          {/* Action hint */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 group-hover:text-primary/80 transition-colors mt-4 pt-3 border-t border-border/30">
            <span className="font-medium">View details</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Subtle corner accent */}
        <div 
          className="absolute bottom-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at bottom right, hsl(var(--${module.color}) / 0.08), transparent 70%)`
          }}
        />
      </Card>
    </motion.div>
  );
}
