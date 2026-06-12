import { CurrencyPipe, PercentPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip } from 'chart.js';
import {form, FormField} from '@angular/forms/signals';
import { debounceTime, Subscription } from 'rxjs';

type Dictioanry = {
  [key: string]: number;
};

interface CompoundedInterestObject {
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
export class MyChart implements OnInit, OnDestroy {

  protected title = 'CompoundInterest';
  readonly yearlyCompounds = 12;  // monthly as default

  readonly currentYear = (new Date).getFullYear();
  years = signal<number>(15);
  interestRate = signal<number>(.07); // rate percentage of interest
  principal = signal<number>(100);
  totalAmountCalculated = signal<number>(0);
  earnedInterestCalculated = signal<number>(0);
  monthlyAddedPrincipal = signal<number>(0);
  totalPrincipal = signal<number>(0);
  myChart!: Chart<"bar", number[], number>;
  sub!: Subscription;

  fooModel = signal<StartingPrincipalMonthlyAdded>({
    startingAmount: this.principal(),
    monthlyAdded: this.monthlyAddedPrincipal()
  });

  inputForm = form(this.fooModel);

  // interestModel = signal<CompoundedInterestObject>({
  //   earnedInterest: this.earnedInterestCalculated(),
  //   interestRate: this.interestRate(),
  //   principal: this.principal(),
  //   totalAmount: this.totalPrincipal(),
  //   year: this.years()
  // });
  //
  // interestForm = form(this.interestModel);

  results: CompoundedInterestObject[] = [];


  // TODO: Make this computed signal rerun for ANY data change
  populateFoo = effect(() => {
    // I assume this will run if either of the four change
    console.log('populateFoo ran');
    const years = this.years();
    const interestRate = this.interestRate();
    const principal = this.inputForm().value().startingAmount;
    const monthlyAdded = this.inputForm().value().monthlyAdded;

    for (var year = 0; year <= years; year++) {

      const totalAmount = this.compoundInterestWithAddedPrincipal(principal, this.yearlyCompounds, interestRate, year, monthlyAdded);
      // Calculate the actual principal invested up to this year
      const principalInvested = principal + (monthlyAdded * 12 * year);
      const earnedInterest = totalAmount - principalInvested;

      this.results.push({
        principal: principalInvested,
        year: this.currentYear + year,
        interestRate: this.interestRate(),
        totalAmount: totalAmount,
        earnedInterest: earnedInterest,
      });
    }

  });
  // populateData compute best attempt

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
    this.populateData();
    this.initChart();
    // this.sub = this.myForm.valueChanges
    //   .pipe(debounceTime(300))
    //   .subscribe((value) => {
    //     this.years.set(value.years);
    //     this.interestRate.set(value.interestRate);
    //     this.principal.set(value.principal);
    //     this.monthlyAddedPrincipal.set(value.monthlyAddedPrincipal);
    //     this.removeData();
    //     this.populateData();
    //     this.updateChart();
    //     this.cdr.markForCheck();
    // });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.myChart.destroy();
  }


  initChart() {
    const that = this;
    this.myChart = new Chart(
     'myChart' , {
        type: 'bar',
        data: {
          labels: this.results.map(x => x['year']),
          datasets: [
            {
              label: "Principal",
              backgroundColor: ["#0000ff", "#9900ff","#47afa2","#6600ff","#cc00ff"],
              data: this.results.map(x => x['principal'])
            },
            {
              label: "Earned Interest",
              backgroundColor: ["#8080FF", "#CC80FF","#75C3B9", "#B280FF", "#E680FF"],
              data: this.results.map(x => x['earnedInterest'])
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

  onSliderChange(event: Event) {
    console.log(event);
  }

  updateChart() {
    // Completely replace the data arrays to ensure Chart.js picks up changes
    this.myChart.data.labels = this.results.map(x => x.year);
    this.myChart.data.datasets[0].data = this.results.map(x => x.principal);
    this.myChart.data.datasets[1].data = this.results.map(x => x.earnedInterest);

    // Force update with mode 'reset' to prevent animation issues
    this.myChart.update('none');
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

  // ALl three of these has to do with grabbing last result
  getFinalTotalAmount(): number {
    return this.results.length > 0 ? this.results[this.results.length - 1].totalAmount : 0;
  }

  getFinalInterestEarned(): number {
    return this.results.length > 0 ? this.results[this.results.length - 1].earnedInterest : 0;
  }

  getFinalPrincipal(): number {
    return this.results.length > 0 ? this.results[this.results.length - 1].principal : 0;
  }


  // TODO: Rework this
  // How to make this MORE reactive
  // How can it be auto called (reactive)
  private populateData() {

    //Must calculate every year between NOW and desired end result
    for (var year = 0; year <= this.years(); year++) {

      // do i need to calcualte totalAmount for each result or just end result?
      const totalAmount = this.compoundInterestWithAddedPrincipal(this.principal(), this.yearlyCompounds, this.interestRate(), year, this.monthlyAddedPrincipal());

      // Calculate the actual principal invested up to this year
      const principalInvested = this.principal() + (this.monthlyAddedPrincipal() * 12 * year);
      const earnedInterest = totalAmount - principalInvested;

      this.results.push({
        principal: principalInvested,
        year: this.currentYear + year,
        interestRate: this.interestRate(),
        totalAmount: totalAmount,
        earnedInterest: earnedInterest,
      });
    }

    // Update display values from the final year (if results exist)
    if (this.results.length > 0) {

      this.totalAmountCalculated.set(this.getFinalTotalAmount());
      this.earnedInterestCalculated.set(this.getFinalInterestEarned());
      this.totalPrincipal.set(this.getFinalPrincipal());
      console.log('Updated display values:', {
        totalAmount: this.totalAmountCalculated(),
        interest: this.earnedInterestCalculated(),
        principal: this.totalPrincipal,
        resultsLength: this.results.length
      });
    }
  }

  // No added principal
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

  private removeData() {
    this.results = [];
  }
}
