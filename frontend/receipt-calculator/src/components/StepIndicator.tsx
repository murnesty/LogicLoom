import { AppStep } from '../types';

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'rawText', label: 'Review Text' },
  { key: 'editItems', label: 'Edit Items' },
  { key: 'split', label: 'Split Bill' },
];

interface StepIndicatorProps {
  currentStep: AppStep;
  onStepClick?: (step: AppStep) => void;
}

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="step-indicator">
      {STEPS.map((step, i) => {
        const canClick = i < currentIndex && !!onStepClick;
        return (
          <div
            key={step.key}
            className={`step ${i === currentIndex ? 'step-active' : ''} ${i < currentIndex ? 'step-done' : ''}${canClick ? ' step-clickable' : ''}`}
            onClick={canClick ? () => onStepClick(step.key) : undefined}
          >
            <div className="step-circle">{i < currentIndex ? '✓' : i + 1}</div>
            <span className="step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
