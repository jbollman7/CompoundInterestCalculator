import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { debounceTime, Subscription } from 'rxjs';

type Dictioanry = {
  [key: string]: number;
};

interface CompoundedInterestObject {
  principal: number
  monthlyAddedPrincipal: number
  year: number
  interestRate: number
  totalAmount: number
  earnedInterest: number
}
@Component({
  selector: 'my-chart',
  imports: [MatSliderModule, FormsModule, ReactiveFormsModule, PercentPipe, CurrencyPipe  ],
  templateUrl: './mychart.html',
  styleUrl: './mychart.css',
})
export class MyChart implements OnInit, OnDestroy {

  protected title = 'CompoundInterest';
  readonly yearlyCompounds = 12;  // monthly as default
  myForm: FormGroup;

  currentYear: number;
  years = 15;
  interestRate = .07; // rate percentage of interest
  principal = 100;
  totalAmountCalculated = 0;
  earnedInterestCalculated = 0;
  monthlyAddedPrincipal = 2;
  calculationResult = this.principal;
  myChart!: Chart<"bar", number[], number>;
  sub!: Subscription;

  constructor(private fb: FormBuilder) {
    // Register only the Chart.js components we need for tree-shaking
    Chart.register(
      BarController,
      BarElement,
      CategoryScale,
      LinearScale,
      Tooltip,
      Legend
    );

    this.myForm = this.fb.group({
      years: [this.years, Validators.required],
      interestRate: [this.interestRate, Validators.required],
      principal: [this.principal, Validators.required],
      monthlyAddedPrincipal: [this.monthlyAddedPrincipal, Validators.required],
    });
    this.currentYear = (new Date).getFullYear();
  }

  ngOnInit() {
    this.populateData();
    this.initChart();
    this.sub = this.myForm.valueChanges
      .pipe(debounceTime(300))
      .subscribe((value) => {
        this.years = value.years;
        this.interestRate = value.interestRate;
        this.principal = value.principal;
        this.monthlyAddedPrincipal = value.monthlyAddedPrincipal;
        this.removeData();
        this.populateData();
        this.updateChart();
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.myChart.destroy();
  }

  results: CompoundedInterestObject[] = [];

  initChart() {
    const that = this;
    this.myChart = new Chart(
     'myChart' , {
        type: 'bar',
        data: {
          labels: this.results.map(x => x['year']),
          datasets: [
            {
              label: "Total",
              //backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9","#c45850"],
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
    // Clear and reuse arrays to prevent Chart.js memory accumulation
    const labels = this.myChart.data.labels as number[];
    const total = this.myChart.data.datasets[0].data as number[];
    const interest = this.myChart.data.datasets[1].data as number[];

    // Clear existing arrays (releases old references)
    labels.length = 0;
    total.length = 0;
    interest.length = 0;

    // Populate with new data (reusing same array objects)
    this.results.forEach(result => {
      labels.push(result.year);
      total.push(result.totalAmount);
      interest.push(result.earnedInterest);
    });

    // Update with animation (smooth transitions)
    this.myChart.update();
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

  // No added principal
  private compoundInterest(principal: number, yearlyCompounds: number, rate: number, time: number): number {
	  return principal * Math.pow((1 + (rate/yearlyCompounds)),yearlyCompounds * time);
  }

  private compoundInterestWithAddedPrincipal(principal: number, yearlyCompounds: number, rate: number, time: number, monthlyAdded: number): number {
    let left = this.compoundInterest(principal, yearlyCompounds, rate, time);
    let right = monthlyAdded * (Math.pow(1 + (rate/yearlyCompounds), yearlyCompounds * time) -1) / (rate / yearlyCompounds);
    let A = left + right

    return A
  }

  private populateData() {

    //Must calculate every year between NOW and desired end result
    for (var year = 0; year <= this.years; year++) {
      this.totalAmountCalculated = this.compoundInterestWithAddedPrincipal(this.principal, this.yearlyCompounds, this.interestRate, year, this.monthlyAddedPrincipal);
      this.earnedInterestCalculated = this.totalAmountCalculated - (this.principal + (this.monthlyAddedPrincipal * 12 * year));

      this.results.push({
        principal: this.principal + this.monthlyAddedPrincipal * 12 * year,
        year: this.currentYear + year,
        interestRate: this.interestRate,
        totalAmount: this.totalAmountCalculated,
        earnedInterest: this.earnedInterestCalculated,
        monthlyAddedPrincipal: this.monthlyAddedPrincipal
      });
    }
  }
}
