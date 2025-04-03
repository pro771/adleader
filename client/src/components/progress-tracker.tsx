import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

type ProgressTrackerProps = {
  progress: {
    adsWatched: number;
    percentage: number;
  };
  isLoading?: boolean;
};

export default function ProgressTracker({ progress, isLoading = false }: ProgressTrackerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-2 w-full mb-4" />
          <Skeleton className="h-5 w-3/4" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Progress</h2>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 mr-2">Ads Watched:</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-medium">
              {progress.adsWatched}
            </span>
            <span className="text-sm font-medium text-gray-700 mx-2">/</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-800 font-medium">
              4
            </span>
          </div>
        </div>
        
        <Progress value={progress.percentage} className="h-2 mb-4" />
        
        <p className="text-sm text-gray-600">
          Watch 4 ads to qualify for the $10 reward. Your progress is automatically saved.
        </p>
      </CardContent>
    </Card>
  );
}
