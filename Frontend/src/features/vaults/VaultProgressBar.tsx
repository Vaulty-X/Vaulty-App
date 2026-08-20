interface VaultProgressBarProps {
  currentAmount: number;
  targetAmount: number;
}

function getProgressPercentage(currentAmount: number, targetAmount: number) {
  if (targetAmount <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100));
}

export function VaultProgressBar({
  currentAmount,
  targetAmount,
}: VaultProgressBarProps) {
  const percentage = getProgressPercentage(currentAmount, targetAmount);
  const roundedPercentage = Math.round(percentage);
  const isComplete = targetAmount > 0 && percentage === 100;

  return (
    <div aria-label="Vault goal progress">
      <div
        className="h-2 w-full rounded-full bg-gray-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedPercentage}
        aria-valuetext={`${roundedPercentage}%`}
      >
        <div
          className="h-2 rounded-full bg-primary-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-sm text-gray-500">
        <span>{targetAmount <= 0 ? 'No target set' : `${roundedPercentage}%`}</span>
        {isComplete && <span className="text-green-600">Goal complete</span>}
      </div>
    </div>
  );
}