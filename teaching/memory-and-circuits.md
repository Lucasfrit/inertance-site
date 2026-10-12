# Exploring memory in a circuit

By Lucas Wybrandt, Inertance. CC BY-SA 4.0; see ../CONTENT-LICENSE.md.

Pressure represents voltage and volume flow represents electric current in this
teaching analogy. A resistor responds to the current conditions. The illustrated
memory component also carries a state that depends on earlier flow. Its plug
position represents that state; the wheel and rack illustrate accumulated motion.
This is a teaching picture, not a calibrated fluid device.

Open the three examples in the Memristor group. In the AC comparison, compare a
resistor with the memory component. In programming and hold, inspect the state
while pulses act and then while current is zero. In initial-state comparison,
identical devices receive the same excitation with different configured starting
states. Compare their resistance and current traces. Rewind to distinguish the
configured starting state from the state reached during playback. Saving stores
the configured initial state, rather than capturing the current playhead state.

The model uses the published two-region educational law, with an optional window
that modifies state motion near its boundaries. The displayed state and plots
come from the native network solve. These results do not establish real-device
accuracy, semiconductor behavior or educational learning gains. Known solver
limits and mode support still apply. Model bibliography: ../THIRD-PARTY-NOTICES.md.
