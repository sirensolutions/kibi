import d3 from 'd3';
import $ from 'jquery';
import { VislibVisualizationsChartProvider } from './_chart';
import { GaugeTypesProvider } from './gauges/gauge_types';

export function GaugeChartProvider(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const gaugeTypes = Private(GaugeTypesProvider);

  class GaugeChart extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);
      this.gaugeConfig = handler.visConfig.get('gauge', {});
      this.gauge = new gaugeTypes[this.gaugeConfig.type](this);
    }

    addEvents(element) {
      const events = this.events;

      return element
        .call(events.addHoverEvent())
        .call(events.addMouseoutEvent())
        .call(events.addClickEvent());
    }

    draw() {
      const self = this;
      const verticalSplit = this.gaugeConfig.verticalSplit;

      return function (selection) {
        selection.each(function (data) {
          const div = d3.select(this);
          const containerMargin = 20;
          const containerWidth = $(this).width() - containerMargin;
          const containerHeight = $(this).height() - containerMargin;
          const width = Math.floor(verticalSplit ? $(this).width() : containerWidth / data.series.length);
          const height = Math.floor((verticalSplit ? containerHeight / data.series.length : $(this).height()) - 25);

          div
            .style('text-align', 'center')
            .style('overflow-y', 'auto');

          // siren: automatic metric element distribution
          const yPos = {};
          const simpleGauges = [];
          // siren: end

          data.series.forEach(series => {
            const svg = div.append('svg')
              .style('display', 'inline-block')
              .style('overflow', 'hidden')
              .attr('width', width);

            if (self.gaugeConfig.type === 'simple') {
              svg.attr('height', height);
            }

            const g = svg.append('g');

            const gauges = self.gauge.drawGauge(g, series, width, height);

            if (self.gaugeConfig.type === 'simple') {
              const bbox = svg.node().firstChild.getBBox();

              // siren: automatic metric element distribution
              simpleGauges.push({ svg, g, bbox });

              const finalWidth = bbox.width + containerMargin / 4;
              const finalHeight = bbox.height + containerMargin / 4;

              svg
              .attr('width', () => {
                return finalWidth;
              })
              .attr('height', () => {
                return finalHeight;
              });

              const transformX = finalWidth / 2;
              const transformY = finalHeight / 2;
              g.attr('transform', `translate(${transformX}, ${transformY})`);

              yPos[g.node().getBoundingClientRect().y] = 1;
              // siren: end
            } else {
              svg.attr('height', height);
              const transformX = width / 2;
              const transformY = self.gaugeConfig.gaugeType === 'Arc' ? height / (2 * 0.75) : height / 2;
              g.attr('transform', `translate(${transformX}, ${transformY})`);
            }

            self.addEvents(gauges);
          });

          // siren: automatic metric element distribution
          if (self.gaugeConfig.type === 'simple') {
            const lines = Object.keys(yPos).length;
            simpleGauges.forEach(gauge => {
              const bbox = gauge.bbox;
              const finalWidth = bbox.width + containerMargin / 4;

              let calcHeight = containerHeight / lines;
              calcHeight = calcHeight < 130 ? 130 : calcHeight;
              const sum = calcHeight * lines >= containerHeight + containerMargin * 2.2 ? 10 : 0;
              const finalHeight = Math.min(containerHeight + containerMargin, calcHeight - containerMargin + sum);

              gauge.svg
                .attr('width', () => {
                  return finalWidth;
                })
                .attr('height', () => {
                  return finalHeight;
                });

              const transformX = finalWidth / 2;
              const transformY = finalHeight / 2;
              gauge.g.attr('transform', `translate(${transformX}, ${transformY})`);
            });
          }
          // siren: end

          if (self.gaugeConfig.type !== 'simple') {
            div.append('div')
              .attr('class', 'chart-title')
              .style('text-align', 'center')
              .text(data.label || data.yAxisLabel);
          }

          self.events.emit('rendered', {
            chart: data
          });

          return div;
        });
      };
    }
  }

  return GaugeChart;
}
