import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Award, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Form schema
const claimSchema = z.object({
  email: z.string().email('Invalid email format'),
  termsAgreed: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type ClaimFormValues = z.infer<typeof claimSchema>;

type RewardClaimProps = {
  email: string;
  onClaimSuccess: () => void;
  isLoading?: boolean;
};

export default function RewardClaim({ email, onClaimSuccess, isLoading = false }: RewardClaimProps) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { toast } = useToast();
  
  // Form setup
  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      email,
      termsAgreed: false,
    },
  });
  
  // Claim reward mutation
  const claimReward = useMutation({
    mutationFn: async (data: { email: string }) => {
      await apiRequest('POST', '/api/rewards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      setShowSuccessModal(true);
      onClaimSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Error claiming reward',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: ClaimFormValues) => {
    const { email } = data;
    claimReward.mutate({ email });
  };
  
  if (isLoading) {
    return null;
  }
  
  return (
    <>
      <Card className="mt-8 border-2 border-green-500">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-500 mb-4">
              <Award className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
            <p className="text-gray-600 mb-6">You've watched all 4 ads and qualified for the reward!</p>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Your Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">We'll send your reward to this email address.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="termsAgreed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the terms and conditions
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full mt-4 bg-green-500 hover:bg-green-600" 
                  disabled={claimReward.isPending}
                >
                  {claimReward.isPending ? 'Processing...' : 'Claim Your Reward'}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
      
      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
              Success!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your reward claim has been processed. Check your email for details on how to redeem your reward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSuccessModal(false)}>
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
