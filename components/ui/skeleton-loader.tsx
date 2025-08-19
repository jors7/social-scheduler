import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const animationClass = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }[animation]

  const variantClass = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md',
  }[variant]

  return (
    <div
      className={cn(
        'bg-gray-200',
        animationClass,
        variantClass,
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'text' ? '1em' : undefined),
      }}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-4 w-[250px] mb-4" />
      <Skeleton className="h-4 w-[200px] mb-2" />
      <Skeleton className="h-4 w-[180px]" />
    </div>
  )
}

export function SkeletonPost() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start space-x-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    </div>
  )
}