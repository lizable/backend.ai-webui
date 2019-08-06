import * as d3 from "d3";

import {css, html, LitElement} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "weightless/card";

import {BackendAiStyles} from "./backend-ai-console-styles";
import {IronFlex, IronFlexAlignment} from "../plastics/layout/iron-flex-layout-classes";

const ByteConverter = {
  toB: bytes => bytes,
  toKB: bytes => bytes / 1024,
  toMB: bytes => bytes / (1024 * 1024),
  toGB: bytes => bytes / (1024 * 1024 * 1024),
  toTB: bytes => bytes / (1024 * 1024 * 1024 * 1024),
  log1024: n => Math.log(n) / Math.log(1024),

  readableUnit: function(bytes) {
    return ["B", "KB", "MB", "GB", "TB"][Math.floor(this.log1024(bytes))];
  },

  scale: function(data) {
    const minUnit = this.readableUnit(d3.min(data, d => d.y));

    return {
      data: data.map(e => ({
        ...e,
        y: this[`to${minUnit}`](e.y)
      })),
      unit: minUnit
    };
  }
};

class BackendAIChartAlt extends LitElement {
  /**
   * @param collection              {object}   Object containing the fields listed below
   * @param collection.data         {Array}    Array containing objects of x y values
   * @param collection.axisTitle    {object}   Object containing x axis title at key "x" and y axis title at key "y"
   * @param collection.axisTitle.x  {string} X axis title
   * @param collection.axisTitle.y  {string} Y axis title
   */
  constructor() {
    super();
    this.title = "";
    this.elevation = 1;
    this.message = "";
    this.width = 300;
    this.height = 300;
    this.type = "line";
    this.colors = [
        "#4bc0c0",
        "#003f5c",
        "#ff6e54",
        "#ffa600"
    ]
  }

  static get is() {
    return "backend-ai-chart";
  }

  static get styles() {
    return [
      BackendAiStyles,
      IronFlex,
      IronFlexAlignment,
      // language=CSS
      css`
        wl-card {
          display: block;
          background: white;
          box-sizing: border-box;
          margin: 15px 0px;
          padding: 0;
          border-radius: 5px;
        }

        wl-card > div {
          font-size: 12px;
        }

        #chart-canvas {
          margin: auto 10px;
        }

        .line {
          fill: none;
          stroke-width: 1;
        }

        .axisGray line {
          stroke: #646464;
        }

        .axisGray path {
          stroke: #646464;
        }

        .textGray text {
          fill: #8c8c8c;
        }

        text.normalize {
          font-size: 11px;
        }

        text.title {
          font-size: 15px;
        }

        .axis {
          font-size: 6px;
        }

        text.tooltip-x,
        text.tooltip-y {
          font-size: 8px;
          fill: #37474f;
        }
      `
    ];
  }

  static get properties() {
    return {
      title: {
        type: String
      },
      elevation: {
        type: Number
      },
      message: {
        type: String
      },
      collection: {
        type: Object,
        hasChanged(newval, oldval) {
          if (oldval === undefined) return true;

          if (newval.period !== oldval.period) return true;

          return false;
        }
      },
      width: {
        type: Number
      },
      height: {
        type: Number
      },
      type: {
        type: String
      }
    };
  }

  updated(changedProps) {
    if (changedProps.has('collection') && changedProps.get("collection") !== undefined) {
      this.draw();
    }
  }

  render() {
    // language=HTML
    return html`
      <div class="layout vertical center">
        <div>
          <svg id="d3"></svg>
        </div>
      </div>
    `;
  }

  _scaledSVGWidth(offsetWidth) {
    return offsetWidth > 1700 ? 1600:
           offsetWidth > 1400 ? 1300:
           offsetWidth > 1200 ? 1000:
           offsetWidth >  900 ?  800:
           offsetWidth >  700 ?  600:
                                 400;
  }

  responsiveHelper(svg) {
    const container = d3.select(svg.node().parentNode),
          width     = parseInt(svg.node().getAttribute("width")),
          height    = parseInt(svg.node().getAttribute("height")),
          aspect    = width / height;

    const resize = () => {
      const { offsetWidth } = this.shadowRoot.host.parentNode;
      const targetWidth = this._scaledSVGWidth(offsetWidth);
      svg.attr("width", targetWidth);
      svg.attr("height", Math.round(targetWidth / aspect));
    };

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("perserveAspectRatio", "xMinYMid")
      .call(resize);

    d3.select(window).on(`resize.${container.attr("id")}`, resize);
  }

  draw() {
    const {
      data,
      xScale,
      xAxis,
      yAxis,
      yScale,
      line,
      rectHeight
    } = this.toolbox();
    const { colors } = this;
    const { axisTitle } = this.collection;

    // queryselector() was used for rect and focus because using d3's select function somehow doesn't work
    const g = d3.select(this.shadowRoot.querySelector("#d3-container")),
          rect = d3.select(this.shadowRoot.querySelector("#mouse-rect")),
          focus = d3.select(this.shadowRoot.querySelector("#focus"));

    // update lines
    const lines = g
      .selectAll("path.line")
      .data(data);

    lines
      .attr("d", line);

    lines
      .exit()
      .remove();

    lines
      .enter()
      .append("path")
      .attr("class", "line")
      .style("stroke", (d, idx) => this.colors[idx])
      .attr("d", line);

    // update x axis
    g
      .select(".x.axis")
      .call(xAxis);

    // update y axis
    g
      .select(".y.axis")
      .call(yAxis);

    // update dot groups. this part does not assign classes or colors to inidividual dots
    const dotGroup = g
      .selectAll(".dot-group")
      .data(data);

    // update existing dot groups.
    dotGroup
      .each(function (pd, pi) {
        const dots = d3
          .select(this)
          .selectAll(".dot")
          .data(datum => datum)
          .attr("cx", d => xScale(d.x))
          .attr("cy", d => yScale(d.y))

        // add more dots if needed
        dots
          .enter()
          .append("circle")
          .attr("class", "dot")
          .style("fill", colors[pi])
          .attr("cx", d => xScale(d.x))
          .attr("cy", d => yScale(d.y))
          .attr("r", 1)

        // remove excess dots if necessary
        dots
          .exit()
          .remove();
      })

    // make new dot groups if necessary
    dotGroup
      .enter()
      .each(function (pd, pidx) {
        d3
          .select(this)
          .append("g")
          .attr("class", `dot-group id${pidx}`)
          .selectAll(".dot")
          .data(pd)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .style("fill", colors[pidx])
          .attr("cx", d => xScale(d.x))
          .attr("cy", d => yScale(d.y))
          .attr("r", 1)
      })

    // remove unnecessary dot groups
    dotGroup
      .exit()
      .remove();

    const circles = focus
      .selectAll("circle")
      .data(data)

    circles.enter()
      .append("circle")
      .attr("class", (d, idx) => `y id${idx}`)
      .style("fill", "none")
      .style("stroke", (d, idx) => this.colors[idx])
      .attr("r", 4);

    circles.exit()
      .remove();

    focus
      .selectAll("g.tooltip")
      .data(data)
      .enter()
      .append("g")
      .each(function (pd, pidx) {
        const tooltip = d3
          .select(this)
          .attr("class", "tooltip")

        tooltip
          .append("rect")
          .attr("width", 0)
          .attr("height", rectHeight)
          .attr("rx", 10).attr("ry", 10)
          .style("fill", "rgba(255, 255, 255, 0.8)")
          .style("stroke", colors[pidx]);

        tooltip
          .append("text")
          .attr("class", "tooltip-x")
          .style("font-size", "8px")
          .style("fill", "#37474f")
          .attr("transform", `translate(0, ${rectHeight / 2})`)
          .attr("dx", 5)
          .attr("dy", "-.3em")

        tooltip
          .append("text")
          .attr("class", "tooltip-y")
          .style("font-size", "8px")
          .style("fill", "37474f")
          .attr("transform",  `translate(0, ${rectHeight / 2})`)
          .attr("dx", 5)
          .attr("dy", "1em")
      })

    focus
      .selectAll("g.tooltip")
      .data(data)
      .exit().remove();

    rect
      .on("mousemove", function() {
        // due to the use of "this", this must be a function, and not an arrow function!
        const bisectDate = d3.bisector(d => d.x).left
        const x0 = xScale.invert(d3.mouse(this)[0]),
              i = bisectDate(data[0], x0, 1),
              d0 = data[0][i - 1],
              d1 = data[0][i],
              closer = x0 - d0.x < d1.x - x0 ? i - 1 : i;
        const formatTime = d3.timeFormat("%b %d %H:%M");

        // adjust position of highlight circles
        focus
          .selectAll("circle")
          .data(data)
          .attr("transform", (datum, idx) => `translate(${xScale(datum[closer].x)}, ${yScale(datum[closer].y)})`);

        // adjust position of vertical line
        focus
          .select("line.y")
          .attr("transform", `translate(${xScale(data[0][closer].x)}, 0)`);

        // adjust width of rectangle and reposition it on top of the highlighted dot
        focus
          .selectAll("g.tooltip")
          .data(data)
          .each(function (pd) {
            const tooltip = d3
              .select(this)

            tooltip
              .select("text.tooltip-y")
              .text(`${axisTitle.y}: ${pd[closer].y}`);

            tooltip
              .select("text.tooltip-x")
              .text(`${axisTitle.x}: ${formatTime(pd[closer].x)}`);

            const w = Math.max(
              tooltip.select("text.tooltip-x").node().getComputedTextLength(),
              tooltip.select("text.tooltip-y").node().getComputedTextLength()
            ) + 10;

            tooltip
              .attr("transform", `translate(${xScale(pd[closer].x) - w / 2}, ${yScale(pd[closer].y) - rectHeight - 5})`)
              .select("rect")
              .attr("width", w);
          })
      });
  }

  toolbox() {
    const margin      = { top: 50, right: 50, bottom: 50, left: 50 },
          graphWidth  = this.width - margin.left - margin.right,
          graphHeight = this.height - margin.top - margin.bottom;

    // assumption: data is already zipped
    const { data } = this.collection;

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data[0], d => d.x))
      .range([0, graphWidth]);

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat(d3.timeFormat("%b %d %H:%M"));

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data.map(datum => d3.max(datum, d => d.y)))])
      .range([graphHeight, 0]);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5);

    const line = d3
      .line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX);

    const rectWidth = 40, rectHeight = 40;

    return { margin, graphWidth, graphHeight, data, xScale, xAxis, yScale, yAxis, line, rectWidth, rectHeight };
  }

  init() {
    const {
      margin,
      graphWidth,
      graphHeight,
      data,
      xScale,
      xAxis,
      yAxis,
      yScale,
      line,
      rectHeight
    } = this.toolbox();
    const { colors } = this;
    const { axisTitle } = this.collection;
    /*
    <svg>
      <g transform="translate(n, n)">
        <g class="x axis" ...></g> for x axis
        <g class="y axis" ...></g> for y axis

        <g class="dot-group idN"></g> for dots. each <g> contains a collection of dots
        ...
        <g class="dot-group idM"></g>

        <path></path> for line graph
        ...
        <path></path>

        <g> for focus
          <circle></circle>   for dot highlight
          ...
          <circle></circle>
          <line></line>       for vertical line
          <g class="tooltip idN"></g> for rectangle tooltips
          ...
          <g class="tooltip idM"></g>
        </g>
      </g>
    </svg>
    */

    // outermost "g" element in <svg>
    const g = d3
      .select(this.shadowRoot.querySelector("#d3"))
      .attr("width", this.width)
      .attr("height", this.height)
      .call(svg => this.responsiveHelper(svg))
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .attr('id', 'd3-container');

    // add x axis
    g
      .append("g")
      .attr("class", "x axis axisGray")
      .attr("transform", `translate(0, ${graphHeight})`)
      .call(xAxis);

    // text label for the x axis
    g
      .append("text")
      .attr(
        "transform",
        `translate(${graphWidth / 2}, ${graphHeight + margin.bottom - 15})`
      )
      .style("text-anchor", "middle")
      .attr("class", "normalize")
      .text(this.collection.axisTitle.x);

    // add y axis
    g
      .append("g")
      .attr("class", "y axis axisGray")
      .call(yAxis);

    // text label for the x axis
    g
      .append("text")
      .attr(
        "transform",
        `translate(${20 - margin.left}, ${graphHeight / 2}) rotate(-90)`
      )
      .style("text-anchor", "middle")
      .attr("class", "normalize")
      .text(this.collection.axisTitle.y);

    // actual line graph
    g
      .selectAll(".line")
      .data(data)
      .enter()
      .append("path")
      .each(function (pd, pidx) {
        d3
          .select(this)
          .datum(pd)
          .attr("class", "line")
          .style("stroke", colors[pidx])
          .attr("d", line);
      })

    // dots in data points
    g
      .selectAll(".dot-group")
      .data(data)
      .enter()
      .append("g")
      .each(function (pd, pidx) {
        d3
          .select(this)
          .attr("class", "dot-group")
          .selectAll(".dot")
          .data(pd)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .style("fill", colors[pidx])
          .attr("cx", d => xScale(d.x))
          .attr("cy", d => yScale(d.y))
          .attr("r", 1);
      })

    // "g" element to render vertical tooltip
    const focus = g
      .append("g")
      .attr("id", "focus")
      .style("display", "none");

    // circles that hightlight dots
    focus
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .each(function (pd, pidx) {
        d3
          .select(this)
          .style("fill", "none")
          .style("stroke", colors[pidx])
          .attr("r", 4);
      })

    focus
      .append("line")
      .attr("class", "y")
      .style("stroke", "rgb(100, 100, 100)")
      .attr("y1", 0)
      .attr("y2", graphHeight);

    focus
      .selectAll(".tooltip")
      .data(data)
      .enter()
      .append("g")
      .each(function (pd, pidx) {
        const tooltip = d3
          .select(this)
          .attr("class", "tooltip");

        tooltip
          .append("rect")
          .attr("width", 0)
          .attr("height", rectHeight)
          .attr("rx", 10)
          .attr("ry", 10)
          .style("fill", "rgba(255, 255, 255, 0.8)")
          .style("stroke", colors[pidx]);

        tooltip
          .append("text")
          .attr("class", "tooltip-x")
          .attr("transform", `translate(0, ${rectHeight / 2})`)
          .attr("dx", 5)
          .attr("dy", "-.3em");

        tooltip
          .append("text")
          .attr("class", "tooltip-y")
          .attr("transform", `translate(0, ${rectHeight / 2})`)
          .attr("dx", 5)
          .attr("dy", "1em");
      })

    g
      .append("rect")
      .attr("id", "mouse-rect")
      .attr("width", graphWidth)
      .attr("height", graphHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {focus.style("display", "inline")})
      .on("mouseout", () => {focus.style("display", "none")})
      .on("mousemove", function() {
        // due to the use of "this", this must be a function, and not an arrow function!
        const bisectDate = d3.bisector(d => d.x).left
        const x0 = xScale.invert(d3.mouse(this)[0]),
              i = bisectDate(data[0], x0, 1),
              d0 = data[0][i - 1],
              d1 = data[0][i],
              closer = x0 - d0.x < d1.x - x0 ? i - 1 : i;
        const formatTime = d3.timeFormat("%b %d %H:%M");

        // relocate the circles that highlight spots
        focus
          .selectAll("circle")
          .data(data)
          .attr("transform", datum => `translate(${xScale(datum[closer].x)}, ${yScale(datum[closer].y)})`);

        // relocate vertical tooltip line
        focus
          .select("line.y")
          .attr("transform", `translate(${xScale(data[0][closer].x)}, 0)`);

        focus
          .selectAll("g.tooltip")
          .data(data)
          .each(function (pd) {
            const tooltip = d3
              .select(this);

            tooltip
              .select("text.tooltip-y")
              .text(`${axisTitle.y}: ${pd[closer].y}`);

            tooltip
              .select("text.tooltip-x")
              .text(`${axisTitle.x}: ${formatTime(pd[closer].x)}`);

            const w = Math.max(
              tooltip.select("text.tooltip-x").node().getComputedTextLength(),
              tooltip.select("text.tooltip-y").node().getComputedTextLength()
            ) + 10;

            tooltip
              .attr("transform", `translate(${xScale(pd[closer].x) - w / 2}, ${yScale(pd[closer].y) - rectHeight - 5})`)
              .select("rect")
              .attr("width", w);
          })

      })

    // tmp transition code
    // g
    //   .append("rect")
    //   .attr("x", -graphWidth)
    //   .attr("y", -graphHeight)
    //   .attr("width", graphWidth)
    //   .attr("height", graphHeight)
    //   .attr("id", "curtain")
    //   .attr('transform', 'rotate(180)')
    //   .style("fill", "#ffffff");

    // g
    //   .transition()
    //   .delay(750)
    //   .duration(3000)
    //   .on("end", () => {
    //     dots
    //       .enter()
    //       .append("circle")
    //       .attr("class", "dot")
    //       .attr("cx", d => xScale(d.x))
    //       .attr("cy", d => yScale(d.y))
    //       .attr("r", 3);
    //   })
    //   .select("#curtain")
    //   .attr("width", 0);
  }

}

customElements.define(BackendAIChartAlt.is, BackendAIChartAlt);