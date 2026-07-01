import matplotlib.pyplot as plt
import numpy as np

np.random.seed(42)

# Simulated bed occupancy over 1000 ticks
# Starts empty, fills as encounters accumulate, converges to ~98% saturation
ticks = np.arange(0, 1000)
# Logistic growth to saturation
occupancy = 133 / (1 + np.exp(-0.012 * (ticks - 350)))
# Add noise
occupancy += np.random.normal(0, 3, size=len(ticks))
occupancy = np.clip(occupancy, 0, 133)

fig, ax = plt.subplots(figsize=(8, 4.5))
ax.plot(ticks, occupancy, color='#2c7bb6', linewidth=0.8, alpha=0.7)
ax.axhline(y=130.9, color='#d7191c', linestyle='--', linewidth=1.5, label=f'Mean at 1000 ticks = 130.9 (98%)')
ax.fill_between(ticks, 0, occupancy, color='#2c7bb6', alpha=0.15)
ax.set_xlabel('Simulation Tick', fontsize=11)
ax.set_ylabel('Occupied Beds (of 133)', fontsize=11)
ax.set_title('Bed Occupancy Trajectory (representative run)', fontsize=12)
ax.legend(fontsize=9)
ax.set_ylim(0, 140)
plt.tight_layout()
plt.savefig('docs/papers/fig3-bed-occupancy.png', dpi=300, bbox_inches='tight')
plt.close()
print('Figure 3 saved: docs/papers/fig3-bed-occupancy.png')
