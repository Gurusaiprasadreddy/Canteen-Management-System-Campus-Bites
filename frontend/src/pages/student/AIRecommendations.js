import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Loader2, Heart, Zap, TrendingUp, Send, X, RotateCcw } from 'lucide-react';
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

  const quickChips = [
    { label: "🤕 Headache", text: "I have a headache" },
    { label: "😰 Stressed", text: "I am feeling stressed" },
    { label: "⚡ Low Energy", text: "I feel tired and low energy" },
    { label: "🏋️ Post-Workout", text: "I just finished a gym workout" },
    { label: "🤧 Cold/Flu", text: "I have a cold" }
  ];

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

  // Gym Freak Mode State
  const [knapsackGoal, setKnapsackGoal] = useState('');
  const [knapsackResult, setKnapsackResult] = useState(null);
  const [knapsackLoading, setKnapsackLoading] = useState(false);
  const [excludedItems, setExcludedItems] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
    }
  }, [user?.user_id, navigate]);

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
        symptom: symptomInput,
        history: symptomMessages // Send full history for context
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

  const handleKnapsackPlanner = async (overrideExclusions = null) => {
    if (!knapsackGoal) {
      toast.error('Please enter a protein goal');
      return;
    }

    setKnapsackLoading(true);
    try {
      const currentExclusions = overrideExclusions || excludedItems;
      const response = await api.post('/recommendations/protein-knapsack', {
        proteinGoal: parseFloat(knapsackGoal),
        excludedItems: currentExclusions
      });
      setKnapsackResult(response.data);
      if (!overrideExclusions && excludedItems.length === 0) {
        toast.success('Optimal protein combo found!');
      } else if (currentExclusions.length > 0) {
        toast.success('Combo updated!');
      }
    } catch (error) {
      toast.error('Failed to calculate protein plan');
      console.error(error);
    } finally {
      setKnapsackLoading(false);
    }
  };

  const handleExcludeItem = (itemId) => {
    const newExcluded = [...excludedItems, itemId];
    setExcludedItems(newExcluded);
    handleKnapsackPlanner(newExcluded); // Trigger immediately with new list
  };

  const handleResetExclusions = () => {
    setExcludedItems([]);
    handleKnapsackPlanner([]); // Trigger immediately with empty list
  };

  const getOptimizedImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('unsplash.com')) {
      return url.includes('?')
        ? `${url}&w=500&q=80&auto=format`
        : `${url}?w=500&q=80&auto=format`;
    }
    return url;
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
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100 h-[70vh] flex flex-col">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-600" />
                Chat with AI Nutritionist
              </h2>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {symptomMessages.length === 0 && (
                  <div className="text-center text-gray-500 mt-10">
                    <Sparkles className="w-12 h-12 mx-auto text-orange-200 mb-2" />
                    <p>Tell me how you're feeling...</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-6">
                      {quickChips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendSymptom(chip.text)}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-orange-100"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {symptomMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                      <p className="whitespace-pre-line">{msg.content}</p>

                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="font-bold text-sm">Recommended Items:</p>
                          {msg.recommendations.map((rec, rIdx) => (
                            <div key={rIdx} className="bg-white p-2 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/student/canteen/${rec.item_id}`)}>
                              <span className="font-semibold text-gray-700">{rec.item_name}</span>
                              <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
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
                    <div className="bg-gray-100 rounded-2xl p-4 rounded-bl-none flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-gray-500 text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                {/* Mini Chips if history exists */}
                {symptomMessages.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                    {quickChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendSymptom(chip.text)}
                        className="whitespace-nowrap bg-gray-50 hover:bg-orange-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    placeholder="Type a symptom (e.g., 'Headache', 'Stressed')"
                    className="rounded-xl border-gray-200 focus:ring-orange-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendSymptom()}
                    disabled={loading}
                  />
                  <Button onClick={() => handleSendSymptom()} className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div >
          </TabsContent >

          <TabsContent value="gym">
            <div className="space-y-8">
              {/* GYM FREAK MODE - PROTEIN PLANNER */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-orange-100">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <span className="text-xl">💪</span>
                  </div>
                  Gym Freak Mode
                </h2>


                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/2">
                    <Label htmlFor="knapsack-goal">Target Protein (g)</Label>
                    <Input
                      id="knapsack-goal"
                      type="number"
                      placeholder="e.g. 50"
                      value={knapsackGoal}
                      onChange={(e) => setKnapsackGoal(e.target.value)}
                      className="mt-2 rounded-xl"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setExcludedItems([]); // Reset on new manual search
                      handleKnapsackPlanner([]);
                    }}
                    disabled={knapsackLoading}
                    className="w-full md:w-auto py-6 px-8 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold"
                  >
                    {knapsackLoading ? <Loader2 className="animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
                    {knapsackLoading ? "Calculating..." : "Find Best Combo"}
                  </Button>
                </div>

                {knapsackResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-100"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-sm text-gray-500">Result Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${knapsackResult.status === 'Exact Match' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {knapsackResult.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Protein</p>
                        <p className="text-3xl font-bold text-orange-600">{knapsackResult.totalProtein}g</p>
                      </div>
                    </div>

                    {excludedItems.length > 0 && (
                      <div className="mb-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetExclusions}
                          className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                          <RotateCcw className="w-3 h-3 mr-2" />
                          Reset Exclusions ({excludedItems.length})
                        </Button>
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Selected Items:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {knapsackResult.selectedItemsDetails.map((item, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl flex gap-3 items-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
                            <img src={getOptimizedImageUrl(item.image_url)} className="w-12 h-12 rounded-lg object-cover bg-gray-100" alt={item.name} />
                            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/student/canteen/${item.canteen_id}`)}>
                              <p className="font-semibold text-sm line-clamp-1 text-gray-900">{item.name}</p>
                              <p className="text-xs text-orange-600 font-medium">{item.protein}g Protein • ₹{item.price}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExcludeItem(item.id);
                              }}
                              title="Exclude this item"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* EXISTING WEEKLY PLANNER (Collapsible or just below) */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-orange-100 opacity-90 hover:opacity-100 transition-opacity">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                  Weekly Diet Planner
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
                  </div>
                </div>

                <Button
                  onClick={handleGenerateDietPlan}
                  disabled={loading}
                  className="w-full py-6 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200"
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
                            <details key={day} className="p-4 bg-gray-50 rounded-xl group" open={day === 'Monday'}>
                              <summary className="font-bold capitalize cursor-pointer hover:text-orange-600 flex justify-between items-center">
                                {day}
                                <span className="text-xs text-gray-400 group-open:hidden">View Meals</span>
                              </summary>
                              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(meals).map(([mealType, meal]) => (
                                  <div key={mealType} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="h-24 overflow-hidden relative">
                                      <img
                                        src={getOptimizedImageUrl(meal.image_url)}
                                        loading="lazy"
                                        alt={meal.item_name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                        <p className="text-xs font-bold text-white uppercase">{mealType}</p>
                                      </div>
                                    </div>
                                    <div className="p-3">
                                      <p className="font-semibold text-gray-900 line-clamp-2 text-sm h-10 mb-1">{meal.item_name}</p>
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{meal.protein}g P</span>
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-600" onClick={() => navigate(`/student/canteen/${meal.canteen_id}`)}>
                                          Buy
                                        </Button>
                                      </div>
                                    </div>
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
            </div>
          </TabsContent>
        </Tabs >
      </main >
    </div >
  );
}
