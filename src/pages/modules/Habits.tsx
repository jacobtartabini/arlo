import { useEffect, useState } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Flame } from "lucide-react";
import { useHabitsPersistence } from "@/hooks/useHabitsPersistence";
import { supabase } from "@/integrations/supabase/client";
import type { HabitWithStreak } from "@/types/habits";

export default function Habits() {
  const { fetchHabitsWithStreaks } = useHabitsPersistence();
  
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Habits — Arlo";
  }, []);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const fetchedHabits = await fetchHabitsWithStreaks();
      setHabits(fetchedHabits);
      setLoading(false);
    };

    checkAuthAndLoad();
  }, []);

  const routines = habits.filter(h => h.category === "routine" && h.enabled);
  const experiments = habits.filter(h => h.category === "experiment" && h.enabled);
  const reflections = habits.filter(h => h.category === "reflection");

  const longestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
  const longestStreakHabit = habits.find(h => h.streak === longestStreak);
  
  // Count missed (habits not completed today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const missedToday = routines.filter(h => {
    if (!h.lastCompleted) return true;
    const lastDate = new Date(h.lastCompleted);
    lastDate.setHours(0, 0, 0, 0);
    return lastDate.getTime() < today.getTime();
  }).length;

  const stats: ModuleStat[] = [
    { label: "Active habits", value: String(routines.length), helper: "Balanced", tone: "positive" },
    { label: "Longest streak", value: `${longestStreak} days`, helper: longestStreakHabit?.title ?? "None", tone: "positive" },
    { label: "Experiments", value: String(experiments.length), helper: "Review Friday", tone: "neutral" },
    { label: "Missed", value: String(missedToday), helper: "Today", tone: missedToday > 0 ? "neutral" : "positive" },
  ];

  const sections: ModuleSection[] = [
    { 
      title: "Routines", 
      description: "Keep it short and repeatable.", 
      items: routines.map(h => ({
        title: h.title,
        description: h.description ?? "Daily habit",
        badge: `${h.streak} day streak`,
      }))
    },
    { 
      title: "Experiments", 
      description: "Trials you're running this week.", 
      items: experiments.map(h => ({
        title: h.title,
        description: h.description ?? "Testing",
        badge: h.streak > 0 ? `${h.streak} days` : "New",
      }))
    },
    { 
      title: "Reflections", 
      description: "Learnings Arlo captured for you.", 
      items: reflections.map(h => ({
        title: h.title,
        description: h.description ?? "Reflection",
        badge: "Note",
      }))
    },
  ];

  return (
    <ModuleTemplate
      icon={Flame}
      title="Habits"
      description="Just the rituals you're working on, the experiments you're testing, and a quick reflection to adjust."
      primaryAction="Add habit"
      secondaryAction="Log reflection"
      stats={stats}
      sections={sections}
    />
  );
}
