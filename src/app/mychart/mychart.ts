import { CurrencyPipe, PercentPipe } from '@angular/common';
import {  Component, OnInit, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip } from 'chart.js';
import { form, FormField, min, max, debounce } from '@angular/forms/signals';

interface CompoundedInterest {
  earnedInterest: number
  interestRate: number
  principal: number
  totalAmount: number
  year: number
}

interface StartingPrincipalMonthlyAdded {
  startingAmount: number
  monthlyAdded: number
}

@Component({
  selector: 'my-chart',
  imports: [PercentPipe, CurrencyPipe, FormField  ],
  templateUrl: './mychart.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './mychart.css',
})
export class MyChart implements OnInit {

  readonly debug = false;
  protected title = 'CompoundInterest';
  readonly yearlyCompounds = 12;  // monthly as default

  private readonly currentYear = (new Date).getFullYear();
  years = signal<number>(5);
  interestRate = signal<number>(.07); // rate percentage of interest
  principal = signal<number>(100);
  totalAmountCalculated = signal<number>(0);
  earnedInterestCalculated = signal<number>(0);
  monthlyAddedPrincipal = signal<number>(0);
  totalPrincipal = signal<number>(0);
  barChart!: Chart<"bar", number[], number>;

  principalMonthlyAddedModel = signal<StartingPrincipalMonthlyAdded>({
    startingAmount: this.principal(),
    monthlyAdded: this.monthlyAddedPrincipal()
  });

  inputForm = form(this.principalMonthlyAddedModel, (fieldPath) => {
    min(fieldPath.startingAmount, 0, {message: 'No negative numbers!'});
    min(fieldPath.monthlyAdded, 0, {message: 'No negative numbers!'});
    max(fieldPath.startingAmount, 1000000000000, {message: '1 trillion is max'});
    max(fieldPath.monthlyAdded, 1000000000000, {message: '1 trillion is max'});
    debounce(fieldPath.startingAmount, 3000);
    debounce(fieldPath.monthlyAdded, 300);
  });

  compoundInterestResults = signal<CompoundedInterest[]>([]);

  getFinalTotalAmount = computed(() => {
    const results = this.compoundInterestResults();
    return results.length > 0 ? results[results.length - 1].totalAmount : 0;
  });

  getFinalInterestEarned = computed(() => {
    const results = this.compoundInterestResults();
    return results.length > 0 ? results[results.length - 1].earnedInterest : 0;
  });

  getFinalPrincipal = computed(() => {
    const results = this.compoundInterestResults();
    return results.length > 0 ? results[results.length - 1].principal : 0;
  });

  /**
   * runs if years, rate, principal, or monthly changes.
   */
  populateData = effect(() => {
    // I assume this will run if either of the four change
    this.compoundInterestResults.set([]);

    let tempResults = [];
    const years = this.years();
    const interestRate = this.interestRate();
    const principal = this.inputForm().value().startingAmount;
    const monthlyAdded = this.inputForm().value().monthlyAdded;

    for (var year = 0; year <= years; year++) {

      const totalAmount = this.compoundInterestWithAddedPrincipal(principal, this.yearlyCompounds, interestRate, year, monthlyAdded);
      // Calculate the actual principal invested up to this year
      const principalInvested = principal + (monthlyAdded * 12 * year);
      const earnedInterest = totalAmount - principalInvested;

      // temp array to hold value
      tempResults.push({
        principal: principalInvested,
        year: this.currentYear + year,
        interestRate: this.interestRate(),
        totalAmount: totalAmount,
        earnedInterest: earnedInterest,
      });
    }

    this.compoundInterestResults.update(items => [...items, ...tempResults]);
  });

  // new effect to update chart
  // After data is populated, second effect will run
  updateChart = effect(() => {
    const results = this.compoundInterestResults();
    // Completely replace the data arrays to ensure Chart.js picks up changes
    this.barChart.data.labels = results.map(x => x.year);
    this.barChart.data.datasets[0].data = results.map(x => x.principal);
    this.barChart.data.datasets[1].data = results.map(x => x.earnedInterest);

    // Force update with mode 'reset' to prevent animation issues
    this.barChart.update('none');
  });

  constructor() {
    // Register only the Chart.js components we need for tree-shaking
    Chart.register(
      BarController,
      BarElement,
      CategoryScale,
      LinearScale,
      Tooltip,
      Legend
    );
  }

  ngOnInit() {
    this.initBarChart();
  }

  initBarChart() {
    const that = this;
    this.barChart = new Chart(
     'barChart' , {
        type: 'bar',
        data: {
          labels: this.compoundInterestResults().map(x => x['year']),
          datasets: [
            {
              label: "Principal",
              backgroundColor: ["#0000ff", "#9900ff","#47afa2","#6600ff","#cc00ff"],
              data: this.compoundInterestResults().map(x => x['principal'])
            },
            {
              label: "Earned Interest",
              backgroundColor: ["#8080FF", "#CC80FF","#75C3B9", "#B280FF", "#E680FF"],
              data: this.compoundInterestResults().map(x => x['earnedInterest'])
            }
          ]
        },
        options: {
          responsive: true,              // Resizes with container
          maintainAspectRatio: false,    // Fill container height
          animation: {
            duration: 400,               // Smooth animations
            easing: 'easeInOutQuart'
          },
          scales: {
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: {
                callback: function(value: any) {
                  return that.formatLabel(value);
                }
              },
              title: {
                display: true,
                text: 'Investment Value'
              }
            },
            x: {
              stacked: true,
              title: {
                display: true,
                text: 'Year'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  return '$' + context.parsed.y.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  });
                }
              }
            }
          }
        }
      });
  }

  incrementYears() {
    // Increment the count by 1.
    this.years.update((value) => value < 100 ? value + 1 : value);
  }

  decrementYears() {
    this.years.update((value) => value > 0 ? value - 1 : value);
  }

  incrementRate() {
    this.interestRate.update((value) => value < 1 ? value + 0.01 : value);
  }

  decrementRate() {
    this.interestRate.update((value) => value > 0 ? value - 0.01 : value);
  }

  private compoundInterest(principal: number, yearlyCompounds: number, rate: number, time: number): number {
	  return principal * Math.pow((1 + (rate/yearlyCompounds)),yearlyCompounds * time);
  }

  private compoundInterestWithAddedPrincipal(principal: number, yearlyCompounds: number, rate: number, time: number, monthlyAdded: number): number {
    let left = this.compoundInterest(principal, yearlyCompounds, rate, time);
    let right = monthlyAdded * (Math.pow(1 + (rate/yearlyCompounds), yearlyCompounds * time) -1) / (rate / yearlyCompounds);
    return left + right
  }

  private formatLabel(value: number): string {
    const numValue = Number(value);

    // trillions
    if (numValue >= 1000000000000) {
      return '$' + (numValue / 1000000000000).toFixed(1) + 'T';
    }
    // Billions
    if (numValue >= 1000000000) {
      return '$' + (numValue / 1000000000).toFixed(1) + 'B';
    }
    // Millions
    else if (numValue >= 1000000) {
      return '$' + (numValue / 1000000).toFixed(1) + 'M';
    }
    // Thousands
    else if (numValue >= 1000) {
      return '$' + (numValue / 1000).toFixed(0) + 'K';
    }
    // Regular
    return '$' + numValue.toLocaleString();
  }
}
