/**
 * SPC (Statistical Process Control) Chart page.
 *
 * Displays control charts with center line (CL), upper/lower control limits
 * (UCL/LCL at +/-3 sigma), and warning limits (+/-2 sigma). Points that
 * exceed control limits are highlighted in red as out-of-control.
 *
 * Metrics:
 * - Defects/Die: defect count per die (single file)
 * - Defect Density: defect density per die (defects / die area in cm^2)
 * - Size Mean: mean defect size per die
 *
 * When multiple files are loaded, shows defect count trend across wafers.
 */
export default function SpcPage(): import("react/jsx-runtime").JSX.Element;
