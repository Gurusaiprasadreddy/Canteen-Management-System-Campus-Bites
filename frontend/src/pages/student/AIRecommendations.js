import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Loader2, Heart, Zap, TrendingUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function AIRecommendations() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [loading, setLoading] = useState(false);
  
  // Symptom chat
  const [symptomMessages, setSymptomMessages] = useState([
    { role: 'assistant', content: 'Hi! Tell me how you\'re feeling (e.g., stressed, headache, tired, cold, fever) and I\'ll suggest the best meals for you.' }
  ]);
  const [symptomInput, setSymptomInput] = useState('');
  
  // Gym goals
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbsGoal, setCarbsGoal] = useState('');
  const [caloriesGoal, setCaloriesGoal] = useState('');
  const [dietPlan, setDietPlan] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
    }
  }, [user, navigate]);

  const handleSendSymptom = async () => {
    if (!symptomInput.trim()) {
      toast.error('Please describe how you\'re feeling');
      return;
    }

    const userMessage = { role: 'user', content: symptomInput };
    setSymptomMessages([...symptomMessages, userMessage]);
    setSymptomInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/recommendations/symptom', { 
        symptom: symptomInput 
      });
      
      const assistantMessage = {
        role: 'assistant',
        content: response.data.explanation,
        recommendations: response.data.recommended_items,
        avoid: response.data.avoid
      };
      
      setSymptomMessages(prev => [...prev, assistantMessage]);
      toast.success('Recommendations ready!');
    } catch (error) {
      toast.error('Failed to get recommendations');
      setSymptomMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDietPlan = async () => {
    if (!proteinGoal || !carbsGoal || !caloriesGoal) {
      toast.error('Please fill in all your daily goals');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai/diet-plan', {
        goal: 'custom',
        current_weight: 70,
        target_weight: 65,
        protein_goal: parseInt(proteinGoal),
        carbs_goal: parseInt(carbsGoal),
        calories_goal: parseInt(caloriesGoal)
      });
      
      setDietPlan(response.data);
      toast.success('Weekly diet plan generated!');
    } catch (error) {
      toast.error('Failed to generate diet plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-xl font-bold gradient-text">AI Meal Planner</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="symptom" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="symptom" data-testid="symptom-tab">
              <Heart className="w-4 h-4 mr-2" />
              Health & Wellness
            </TabsTrigger>
            <TabsTrigger value="gym" data-testid="gym-tab">
              <Zap className="w-4 h-4 mr-2" />
              Fitness Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="symptom">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-600" />
                Chat with AI Nutritionist
              </h2>

              <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto" data-testid="chat-messages">
                {symptomMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="font-bold text-sm">Recommended Items:</p>
                          {msg.recommendations.map((item, idx) => (
                            <div key={idx} className="p-2 bg-white/20 rounded-lg">
                              <p className="font-semibold">{item.item_name}</p>
                              <p className="text-sm opacity-90">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.avoid && msg.avoid.length > 0 && (
                        <div className="mt-3">
                          <p className="font-bold text-sm">Avoid:</p>
                          <p className="text-sm opacity-90">{msg.avoid.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-4 rounded-2xl">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="How are you feeling? (e.g., stressed, headache, tired)"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendSymptom()}
                  className="rounded-xl"
                  disabled={loading}
                  data-testid="symptom-input"
                />
                <Button
                  onClick={handleSendSymptom}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500"
                  data-testid="send-symptom-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gym">
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-orange-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-600" />
                Set Your Daily Nutrition Goals
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <Label htmlFor="protein">Daily Protein Goal (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    placeholder="150"
                    value={proteinGoal}
                    onChange={(e) => setProteinGoal(e.target.value)}
                    className="mt-2 rounded-xl"
                    data-testid="protein-goal-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 1.6-2.2g per kg body weight</p>
                </div>

                <div>
                  <Label htmlFor="carbs">Daily Carbs Goal (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    placeholder="250"
                    value={carbsGoal}
                    onChange={(e) => setCarbsGoal(e.target.value)}
                    className="mt-2 rounded-xl"
                    data-testid="carbs-goal-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 3-5g per kg body weight</p>
                </div>

                <div>
                  <Label htmlFor="calories">Daily Calories Goal</Label>
                  <Input
                    id="calories"
                    type="number"
                    placeholder="2500"
                    value={caloriesGoal}
                    onChange={(e) => setCaloriesGoal(e.target.value)}
                    className="mt-2 rounded-xl"
                    data-testid="calories-goal-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Based on your activity level</p>
                </div>
              </div>

              <Button
                onClick={handleGenerateDietPlan}
                disabled={loading}
                className="w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500"
                data-testid="generate-plan-btn"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                ) : (
                  <>Generate Weekly Meal Plan</>
                )}
              </Button>

              {dietPlan && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-sm text-gray-600">Target Calories</p>
                      <p className="text-2xl font-bold text-orange-600">{dietPlan.daily_calories || caloriesGoal}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-sm text-gray-600">Target Protein</p>
                      <p className="text-2xl font-bold text-orange-600">{dietPlan.protein_target || proteinGoal}g</p>
                    </div>
                  </div>

                  {dietPlan.tips && dietPlan.tips.length > 0 && (
                    <div className="p-6 bg-blue-50 rounded-xl">
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Personalized Tips
                      </h3>
                      <ul className="space-y-2">
                        {dietPlan.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span className="text-gray-700">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {dietPlan.weekly_plan && Object.keys(dietPlan.weekly_plan).length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Your 7-Day Meal Plan</h3>
                      <div className="space-y-3">
                        {Object.entries(dietPlan.weekly_plan).map(([day, meals]) => (
                          <details key={day} className="p-4 bg-gray-50 rounded-xl">
                            <summary className="font-bold capitalize cursor-pointer hover:text-orange-600">
                              {day}
                            </summary>
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                              {Object.entries(meals).map(([mealType, meal]) => (
                                <div key={mealType} className="p-3 bg-white rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase">{mealType}</p>
                                  <p className="font-semibold text-sm">{meal.item_name}</p>
                                  {meal.portion && <p className="text-xs text-gray-600">{meal.portion}</p>}
                                </div>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
