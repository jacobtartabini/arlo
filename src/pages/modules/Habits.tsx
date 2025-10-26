import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Heart, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const habits = [
  { id: 1, name: "Morning Meditation", streak: 7, completed: true },
  { id: 2, name: "Exercise", streak: 5, completed: false },
  { id: 3, name: "Read 30 min", streak: 12, completed: true },
  { id: 4, name: "Drink Water", streak: 3, completed: false },
  { id: 5, name: "Journal", streak: 8, completed: true },
];

export default function Habits() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Habits — Arlo";
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 spatial-grid opacity-30" />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="glass rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Habits</h1>
          </div>
        </div>
        <Button className="glass-intense">
          <Plus className="w-4 h-4 mr-2" />
          New Habit
        </Button>
      </motion.header>

      {/* Content */}
      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-4">
          {habits.map((habit, index) => (
            <motion.div
              key={habit.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      habit.completed ? 'bg-primary' : 'bg-muted'
                    }`}>
                      {habit.completed ? (
                        <Check className="w-6 h-6 text-primary-foreground" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{habit.name}</h3>
                      <p className="text-sm text-muted-foreground">{habit.streak} day streak</p>
                    </div>
                  </div>
                  <Button variant={habit.completed ? "secondary" : "default"}>
                    {habit.completed ? "Completed" : "Mark Done"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Floating Chat Bar */}
      <FloatingChatBar />
    </div>
  );
}
