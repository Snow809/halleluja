/*
 * Adapted from Purity UI Dashboard chart wrappers. Uses ApexCharts like the
 * original template, with Intelli‑Talent data mapped at the page boundary.
 */
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

const baseOptions: ApexOptions = {
  chart: {
    toolbar: { show: false },
    fontFamily: "Inter, Segoe UI, sans-serif",
    foreColor: "#A0AEC0",
  },
  dataLabels: { enabled: false },
  grid: {
    borderColor: "#EDF2F7",
    strokeDashArray: 3,
  },
  tooltip: { theme: "light" },
};

export function BlueAreaChart({ labels, data, name = "Valeur" }: { labels: string[]; data: number[]; name?: string }) {
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: "area" },
    colors: ["#2f76df"],
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] },
    },
    xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#A0AEC0" } } },
  };
  return <Chart options={options} series={[{ name, data }]} type="area" width="100%" height="100%" />;
}

export function BlueBarChart({ labels, data, name = "Valeur" }: { labels: string[]; data: number[]; name?: string }) {
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: "bar" },
    colors: ["#2f76df"],
    plotOptions: { bar: { borderRadius: 8, columnWidth: "42%" } },
    xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#A0AEC0" } } },
  };
  return <Chart options={options} series={[{ name, data }]} type="bar" width="100%" height="100%" />;
}

export function BlueDonutChart({ labels, data }: { labels: string[]; data: number[] }) {
  const options: ApexOptions = {
    ...baseOptions,
    labels,
    colors: ["#2f76df", "#63b3ed", "#805ad5", "#38b2ac", "#f6ad55", "#fc8181"],
    legend: { position: "bottom" },
    plotOptions: { pie: { donut: { size: "68%" } } },
  };
  return <Chart options={options} series={data} type="donut" width="100%" height="100%" />;
}

export function BlueRadarChart({ labels, data, name = "Score" }: { labels: string[]; data: number[]; name?: string }) {
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: "radar" },
    colors: ["#2f76df"],
    xaxis: { categories: labels },
    yaxis: { show: false },
    markers: { size: 4 },
  };
  return <Chart options={options} series={[{ name, data }]} type="radar" width="100%" height="100%" />;
}
