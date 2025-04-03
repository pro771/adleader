import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Loader2, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AdStatus = 'ready' | 'loading' | 'playing' | 'completed';

type AdViewerProps = {
  onAdComplete: () => void;
  disabled?: boolean;
};

export default function AdViewer({ onAdComplete, disabled = false }: AdViewerProps) {
  const [adStatus, setAdStatus] = useState<AdStatus>('ready');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  
  // Mutation to record ad view
  const recordAdView = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/ad-views');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ad-views'] });
      toast({
        title: 'Ad completed',
        description: 'Your progress has been updated.',
      });
      onAdComplete();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to record ad view: ' + error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handle ad playback
  const playAd = () => {
    if (adStatus !== 'ready' && adStatus !== 'completed') return;
    
    // Set loading state
    setAdStatus('loading');
    
    // Simulate ad loading
    setTimeout(() => {
      setAdStatus('playing');
      setProgress(0);
    }, 1500);
  };
  
  // Progress timer for ad playback
  useEffect(() => {
    let interval: number | undefined;
    
    if (adStatus === 'playing') {
      interval = window.setInterval(() => {
        setProgress((prev) => {
          const next = prev + 1;
          
          // Once the ad completes
          if (next >= 100) {
            clearInterval(interval);
            setAdStatus('completed');
            
            // Record the ad view
            recordAdView.mutate();
            
            return 100;
          }
          
          return next;
        });
      }, 100); // 10 seconds for the ad
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [adStatus]);
  
  // Reset ad after completion
  useEffect(() => {
    let timeout: number | undefined;
    
    if (adStatus === 'completed') {
      timeout = window.setTimeout(() => {
        setAdStatus('ready');
      }, 3000);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [adStatus]);
  
  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Watch Ad to Earn Rewards</h2>
        <p className="text-gray-600 mb-6">
          Click the button below to watch an ad. Each completed ad brings you closer to claiming your reward.
        </p>
        
        {/* Ad Container */}
        <div className="relative aspect-video bg-gray-100 rounded-lg mb-6 overflow-hidden">
          {/* Ready State */}
          {adStatus === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <Play className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-500">Your ad is ready to play. Click the button below to start.</p>
            </div>
          )}
          
          {/* Loading State */}
          {adStatus === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="h-16 w-16 text-gray-400 mb-4 animate-spin" />
              <p className="text-gray-500">Loading your ad...</p>
            </div>
          )}
          
          {/* Playing State */}
          {adStatus === 'playing' && (
            <div className="absolute inset-0">
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-xl mb-2">Ad is playing...</p>
                  <p className="text-sm text-gray-300 mb-4">Please wait while the ad completes</p>
                  <div className="w-full bg-gray-600 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Completed State */}
          {adStatus === 'completed' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-green-500 bg-opacity-10">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-green-500 font-medium text-lg">Ad completed successfully!</p>
              <p className="text-gray-500 mt-2">Your progress has been updated.</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={playAd} 
            disabled={adStatus !== 'ready' || disabled || recordAdView.isPending} 
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4 mr-2" />
            {adStatus === 'ready' ? 'Watch Ad' : 
              adStatus === 'loading' ? 'Loading...' : 
              adStatus === 'playing' ? 'Playing...' : 'Ad Completed'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
