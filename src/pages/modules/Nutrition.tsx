import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Apple } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const meals = [
  { id: 1, name: "Breakfast", calories: 450, time: "8:00 AM", items: "Oatmeal, Banana, Coffee" },
  { id: 2, name: "Lunch", calories: 680, time: "12:30 PM", items: "Chicken Salad, Quinoa" },
  { id: 3, name: "Snack", calories: 200, time: "3:00 PM", items: "Apple, Almonds" },
  { id: 4, name: "Dinner", calories: 470, time: "7:00 PM", items: "Grilled Salmon, Vegetables" },
];

export default function Nutrition() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Nutrition — Arlo";
  }, []);

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const targetCalories = 2200;
  const percentage = (totalCalories / targetCalories) * 100;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 spatial-grid opacity-30" />

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Apple className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Nutrition</h1>
          </div>
        </div>
        <Button className="glass-intense">
          <Plus className="w-4 h-4 mr-2" />
          Log Meal
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Calorie Counter */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="glass-intense p-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Calories</p>
                    <h2 className="text-4xl font-bold text-foreground">
                      {totalCalories} <span className="text-xl text-muted-foreground">/ {targetCalories}</span>
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-semibold text-primary">{targetCalories - totalCalories}</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Meals */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Today's Meals</h3>
            {meals.map((meal, index) => (
              <motion.div
                key={meal.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold text-foreground">{meal.name}</h4>
                      <p className="text-sm text-muted-foreground">{meal.time}</p>
                      <p className="text-sm text-muted-foreground">{meal.items}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{meal.calories}</p>
                      <p className="text-xs text-muted-foreground">calories</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Chat Bar */}
      <FloatingChatBar />
    </div>
  );
}
