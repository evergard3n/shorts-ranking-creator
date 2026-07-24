import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { cn } from '@/lib/utils'

function Slider({
  className,
  ...props
}: SliderPrimitive.Root.Props) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-1.5 w-full items-center">
        <SliderPrimitive.Track className="relative h-full w-full grow rounded-full bg-secondary">
          <SliderPrimitive.Indicator className="absolute rounded-full bg-primary" />
          <SliderPrimitive.Thumb className="block size-3 rounded-full border border-primary/50 bg-primary shadow transition-[color,box-shadow] hover:ring-4 hover:ring-primary/20 focus-visible:ring-4 focus-visible:ring-primary/20 outline-none" />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
