# Report waveform view

## Circuit-derived expressions (1 October 2026)

Ripple remains the default for new documents; explicitly saved modes are preserved.
Simulation plots now annotate measured min/max levels with MathML expressions
derived from the actual solved graph (KVL, KCL or Ohm's law). The expressions
are evaluated at the extremum's time and switching state; hover a label for its
numeric value and state. Use the reference-lines toggle to hide these labels.
Expand **Waveform equations · circuit-derived** below each plot for component
laws and instantaneous equations for sampled switching states (up to 12).

This works independently of preset recognition on all ten presets, individual
windings, and supported custom circuits. Branch subscripts are actual component
IDs. `φ` means node potential. Derivatives are discretized by the backward-Euler
solver; winding `Ljk` denotes self/mutual inductance. The engine uses effective
device values, so conducting device losses are not silently omitted.

These are circuit/state equations, not general closed-form solutions in time.
Ripple amplitudes still come from the numerical simulation. The engine checks
KVL/KCL against the plotted signal; if a reduced teaching model violates an
instantaneous relation it falls back to the solved signal, explicitly labeled.
Leakage is experimental/incomplete and has not been expanded by this change.
Check: `node simulator/check-editor-waveform-expressions.cjs` in cwas.

## Full-bridge boost report reference

Choose **Full bridge · boost type**, then **Waveforms → View → Ideal report**.
Select a component or use **All components** to see voltage/current pairs.
Winding selection remains in the component properties panel.

The plot-only teaching reference follows the state table in
`/Users/lucaswybrandt/dev/pe1/report1/scripts/analysis.py` and its waveform figures.
Lecture slide 39 is physical PDF page 41 of `Section-4_noter.pdf`.

The reference assumes ideal devices, infinite filtering L/C, CCM, symmetric
overlap current sharing, equal positive secondary turns and no source-feed drop.
It uses the circuit's DC source, load resistance, winding ratio and PWM duty.
The overlap duty is `D = 2 d_gate − 1`; `2T = 1 / f_bridge` and `n = Ns / Np`.
`Vo = n Vi / (1 − D)`, `Io = Vo / Rload`, `Ii = Vo Io / Vi`.

Lines end in mathematical amplitude expressions such as `Vo/n`, `−Vo/n`,
`Vi−Vo/n` and `Ii/n−Io`. Values are not measured extrema renamed as formulas.
The graph uses switching boundaries `0, DT, T, T+DT, 2T`.

This view does not change the simulation model, circuit document or animation.
Its cursor maps the simulation run fraction onto the teaching cycle. Hover
reports the teaching curve's value and teaching-cycle time. Numeric simulation
statistics remain available by switching View back to Simulation.

Editor winding currents are positive into dotted terminals. Therefore W2
current has the opposite sign from the report's secondary outward arrow. W3
voltage is the negative of the report's end-to-centre s1 voltage because its
editor p3 terminal is the centre tap. Primary conventions agree.

Graph recognition and PWM validation disable this reference for incompatible
topologies, unequal duty/frequency, invalid phases, manual switching, AC input,
unequal or reversed secondary turns. Ideal simulation support is independent
and remains controlled by `EditorModes`.

Validation: `node simulator/check-editor-waveform-reference.cjs` in cwas checks
gain, capacitor charge, inductor/transformer volt-second balance, winding power
balance and sign conventions over twelve duty/turns cases, including zero
overlap. Website browser checks cover view switching, formatted line-end
labels, all-component plots and phone layout.


## Selected Ideal simulation (1 October 2026)

The full-bridge boost Ideal model now shares this report state table. Select Ideal
to apply it to animation, meters and Simulation plots. Choosing the report plot
view by itself still leaves the selected physics unchanged. The reduction omits
source-feed drop, filter ripple and transformer excitation, and assumes equal
overlap sharing. Output-capacitor current alternates while pressure/stored charge
remain constant under the ripple-neglected approximation. See cwas
`docs/SIMULATION-MODES.md` for supported timing and validation.
