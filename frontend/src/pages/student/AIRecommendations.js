import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Loader2, Heart, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function AIRecommendations() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [loading, setLoading] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [gymGoal, setGymGoal] = useState('weight_loss');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
    }
  }, [user, navigate]);

  const handleSymptomRecommendations = async () => {
    if (!symptom) {
      toast.error('Please enter a symptom');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai/recommendations/symptom', { symptom });
      setRecommendations(response.data);
      toast.success('Recommendations generated!');
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleGymDietPlan = async () => {
    if (!currentWeight || !targetWeight) {
      toast.error('Please enter your current and target weight');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai/diet-plan', {
        goal: gymGoal,
        current_weight: parseFloat(currentWeight),
        target_weight: parseFloat(targetWeight)
      });
      setDietPlan(response.data);
      toast.success('Diet plan generated!');
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
            <span className="text-xl font-bold gradient-text">AI Recommendations</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="symptom" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="symptom" data-testid="symptom-tab">
              <Heart className="w-4 h-4 mr-2" />
              Symptom Based
            </TabsTrigger>
            <TabsTrigger value="gym" data-testid="gym-tab">
              <Zap className="w-4 h-4 mr-2" />
              Gym Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="symptom">
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-orange-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-600" />
                Symptom-Based Meal Recommendations
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="symptom">How are you feeling?</Label>
                  <Input
                    id="symptom"
                    type="text"
                    placeholder="e.g., stressed, headache, tired, cold, fever"
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    className="mt-2 rounded-xl"
                    data-testid="symptom-input"
                  />
                </div>

                <Button
                  onClick={handleSymptomRecommendations}
                  disabled={loading}
                  className="w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500"
                  data-testid="get-symptom-recommendations-btn"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <>Get Recommendations</>
                  )}
                </Button>
              </div>

              {recommendations && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-orange-50 rounded-xl">
                    <h3 className="font-bold mb-2">Explanation:</h3>
                    <p className="text-gray-700">{recommendations.explanation}</p>
                  </div>

                  <div>
                    <h3 className="font-bold mb-3">Recommended Items:</h3>
                    <div className="space-y-2">
                      {recommendations.recommended_items?.map((item, idx) => (
                        <div key={idx} className="p-4 bg-green-50 rounded-xl">
                          <p className="font-bold text-green-800">{item.item_name}</p>
                          <p className="text-sm text-gray-600">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {recommendations.avoid?.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-3">Foods to Avoid:</h3>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.avoid.map((item, idx) => (
                          <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gym">
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-orange-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-600" />
                Gym Goals Diet Plan
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="goal">Your Goal</Label>
                  <Select value={gymGoal} onValueChange={setGymGoal}>
                    <SelectTrigger className="mt-2 rounded-xl" data-testid="goal-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="current-weight">Current Weight (kg)</Label>
                    <Input
                      id="current-weight"
                      type="number"
                      placeholder="70"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      className="mt-2 rounded-xl"
                      data-testid="current-weight-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="target-weight">Target Weight (kg)</Label>
                    <Input
                      id="target-weight"
                      type="number"
                      placeholder="65"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="mt-2 rounded-xl"
                      data-testid="target-weight-input"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGymDietPlan}
                  disabled={loading}
                  className="w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500"
                  data-testid="get-diet-plan-btn"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <>Generate Weekly Plan</>
                  )}
                </Button>
              </div>

              {dietPlan && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-sm text-gray-600">Daily Calories</p>
                      <p className="text-2xl font-bold text-orange-600">{dietPlan.daily_calories}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-sm text-gray-600">Protein Target</p>
                      <p className="text-2xl font-bold text-orange-600">{dietPlan.protein_target}g</p>
                    </div>
                  </div>

                  {dietPlan.tips && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h3 className="font-bold mb-2">Tips:</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {dietPlan.tips.map((tip, idx) => (
                          <li key={idx} className="text-sm text-gray-700">{tip}</li>
                        ))}
                      </ul>
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
