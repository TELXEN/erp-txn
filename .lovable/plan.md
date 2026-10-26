# Ganancia/Pérdida: fondos negros por el color del tema

In the Dashboard Financiero's «Ganancia/Pérdida» panel, every black background will use the active theme's primary color with white text. It changes automatically when you switch themes.

Places affected:
- The label at the top of the panel.
- The active mode button (the inactive ones stay light).
- The title bar of the result.
- The number squares (1, 2, 3…) to the left of each row.

The green/red box for the result (gain or loss) stays as it is.

## Technical details
- `src/components/dashboard/GananciaPerdida.tsx`: replace `bg-ink text-background` with `bg-primary text-primary-foreground` (lines 140, 159, 170, 180).
- Check it on screen with two themes.
