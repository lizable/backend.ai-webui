/**
 @license
 Copyright (c) 2015-2020 Lablup Inc. All rights reserved.
 */

import {translate as _t} from "lit-translate";
import {css, customElement, html, property} from "lit-element";
import {render} from 'lit-html';
import {BackendAIPage} from './backend-ai-page';

import '@vaadin/vaadin-grid/theme/lumo/vaadin-grid';
import '@vaadin/vaadin-grid/theme/lumo/vaadin-grid-column';
import '@vaadin/vaadin-grid/theme/lumo/vaadin-grid-sort-column';
import '../plastics/lablup-shields/lablup-shields';

import '@material/mwc-linear-progress';
import '@material/mwc-icon-button';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-icon/mwc-icon';

import {default as PainKiller} from "./backend-ai-painkiller";
import {BackendAiStyles} from "./backend-ai-general-styles";
import {IronFlex, IronFlexAlignment} from "../plastics/layout/iron-flex-layout-classes";
import './backend-ai-dialog';
import './lablup-progress-bar';

/**
 Backend.AI Agent List

 Example:

 <backend-ai-storage-proxy-list active=true>
 ... content ...
 </backend-ai-storage-proxy-list>

 @group Backend.AI Console
 @element backend-ai-storage-proxy-list
 */

@customElement("backend-ai-storage-proxy-list")
export default class BackendAIStorageProxyList extends BackendAIPage {
  @property({type: String}) condition = 'running';
  @property({type: Array}) agents = Array();
  @property({type: Object}) agentsObject = Object();
  @property({type: Object}) agentDetail = Object();
  @property({type: Object}) notification = Object();
  @property({type: Object}) agentDetailDialog = Object();
  @property({type: Object}) _boundEndpointRenderer = this.endpointRenderer.bind(this);
  @property({type: Object}) _boundTypeRenderer = this.typeRenderer.bind(this);
  @property({type: Object}) _boundResourceRenderer = this.resourceRenderer.bind(this);
  @property({type: Object}) _boundCapabilitiesRenderer = this.capabilitiesRenderer.bind(this);
  @property({type: Object}) _boundControlRenderer = this.controlRenderer.bind(this);
  @property({type: String}) filter = '';

  constructor() {
    super();
  }

  static get styles() {
    return [
      BackendAiStyles,
      IronFlex,
      IronFlexAlignment,
      // language=CSS
      css`
        vaadin-grid {
          border: 0;
          font-size: 14px;
          height: var(--list-height, calc(100vh - 200px));
        }

        mwc-icon {
          --mdc-icon-size: 16px;
        }

        img.indicator-icon {
          width: 16px !important;
          height: 16px !important;
        }

        paper-icon-button {
          --paper-icon-button: {
            width: 25px;
            height: 25px;
            min-width: 25px;
            min-height: 25px;
            padding: 3px;
            margin-right: 5px;
          };
        }

        div.indicator,
        span.indicator {
          font-size: 9px;
          margin-right: 5px;
        }

        #agent-detail {
          --component-max-width: 90%;
        }

        lablup-progress-bar {
          width: 100px;
          border-radius: 3px;
          height: 10px;
          --mdc-theme-primary: #3677eb;
          --mdc-linear-progress-buffer-color: #98be5a;
        }

        lablup-progress-bar.cpu {
          --progress-bar-height: 5px;
          margin-bottom: 0;
        }

        lablup-progress-bar.cuda {
          --progress-bar-height: 15px;
          margin-bottom: 5px;
        }

        lablup-progress-bar.mem {
          --progress-bar-height: 15px;
          width: 100px;
          margin-bottom: 0;
        }

        lablup-shields {
          margin: 1px;
        }

        .resource-indicator {
          width: 100px !important;
        }

      `];
  }

  firstUpdated() {
    this.notification = globalThis.lablupNotification;
    this.agentDetailDialog = this.shadowRoot.querySelector('#agent-detail');
  }

  connectedCallback() {
    super.connectedCallback();
  }

  /**
   * Change state to 'ALIVE' when backend.ai client connected.
   *
   * @param {Boolean} active - The component will work if active is true.
   */
  async _viewStateChanged(active: Boolean) {
    await this.updateComplete;
    if (active === false) {
      return;
    }
    // If disconnected
    if (typeof globalThis.backendaiclient === "undefined" || globalThis.backendaiclient === null || globalThis.backendaiclient.ready === false) {
      document.addEventListener('backend-ai-connected', () => {
        let status = 'ALIVE';
        this._loadAgentList(status);
      }, true);
    } else { // already connected
      let status = 'ALIVE';
      this._loadAgentList(status);
    }
  }

  /**
   * Load an agents list with agent's backend.ai information.
   *
   * @param {string} status - The agent's backend.ai client status.
   */
  _loadAgentList(status: string = 'running') {
    if (this.active !== true) {
      return;
    }
    let fields: Array<String>;
    switch (this.condition) {
      case 'running':
        status = 'ALIVE';
        fields = ['id', 'status', 'version', 'addr', 'region', 'compute_plugins', 'first_contact',
          'lost_at', 'status_changed', 'live_stat', 'cpu_cur_pct', 'mem_cur_bytes', 'available_slots', 'occupied_slots', 'scaling_group'];
        break;
      case 'terminated':
        status = 'TERMINATED';
        fields = ['id', 'status', 'version', 'addr', 'region', 'compute_plugins', 'first_contact',
          'lost_at', 'status_changed', 'cpu_cur_pct', 'mem_cur_bytes', 'available_slots', 'occupied_slots', 'scaling_group'];
        break;
      case 'archived':
      default:
        status = 'ALIVE';
        fields = ['id', 'status', 'version', 'addr', 'region', 'compute_plugins', 'first_contact',
          'lost_at', 'status_changed', 'cpu_cur_pct', 'mem_cur_bytes', 'available_slots', 'occupied_slots', 'scaling_group'];
    }
    if (globalThis.backendaiclient.supports('hardware-metadata')) {
      fields.push('hardware_metadata');
    }
    globalThis.backendaiclient.storageproxy.list().then(response => {
      let agents = response.storage_volume_list.items;
      console.log(agents);
      this.agents = agents;
      if (this.active === true) {
        setTimeout(() => {
          this._loadAgentList(status)
        }, 15000);
      }
    }).catch(err => {
      if (err && err.message) {
        this.notification.text = PainKiller.relieve(err.title);
        this.notification.detail = err.message;
        this.notification.show(true, err);
      }
    });
  }

  /**
   * Convert the value byte to MB.
   *
   * @param {number} value
   */
  _byteToMB(value) {
    return Math.floor(value / 1000000);
  }

  /**
   * Convert the value MB to GB.
   *
   * @param {number} value
   */
  _MBtoGB(value) {
    return Math.floor(value / 1024);
  }

  /**
   * Covert start date to human readable date.
   *
   * @param {Date} start
   */
  _humanReadableDate(start) {
    let d = new Date(start);
    return d.toLocaleString();
  }

  /**
   * Increase index by 1.
   *
   * @param {number} index
   */
  _indexFrom1(index: number) {
    return index + 1;
  }

  /**
   * Return the heartbeat status.
   *
   * @param {string} state
   */
  _heartbeatStatus(state: string) {
    return state;
  }

  /**
   * Render an index.
   *
   * @param {DOMelement} root
   * @param {object} column (<vaadin-grid-column> element)
   * @param {object} rowData
   */
  _indexRenderer(root, column, rowData) {
    let idx = rowData.index + 1;
    render(
      html`
        <div>${idx}</div>
      `,
      root
    );
  }

  /**
   * Render endpoint with IP and name.
   *
   * @param {DOMelement} root
   * @param {object} column (<vaadin-grid-column> element)
   * @param {object} rowData
   */
  endpointRenderer(root, column?, rowData?) {
    render(
      // language=HTML
      html`
        <div>${rowData.item.id}</div>
        <div class="indicator monospace">${rowData.item.addr}</div>
      `, root
    );
  }

  /**
   * Render regions by platforms and locations.
   *
   * @param {DOMelement} root
   * @param {object} column (<vaadin-grid-column> element)
   * @param {object} rowData
   */
  typeRenderer(root, column?, rowData?) {
    let platform: string = rowData.item.backend;
    let color: string;
    let icon: string;
    switch (platform) {
      case "xfs":
        color = 'blue';
        icon = 'xfs';
        break;
      case "ceph":
      case "cephfs":
        color = 'lightblue';
        icon = 'ceph';
        break;
      case "vfs":
      case "nfs":
        color = 'green';
        icon = 'nfs';
        break;
      case "purestorage":
        color = 'red';
        icon = 'purestorage';
        break;
      case "dgx":
        color = 'green';
        icon = 'local';
        break;
      default:
        color = 'yellow';
        icon = 'local';
    }
    render(
      // language=HTML
      html`
        <div class="horizontal start-justified center layout">
          <img src="/resources/icons/${icon}.png" style="width:32px;height:32px;"/>
          <lablup-shields app="Backend" color="${color}"
                          description="${rowData.item.backend}" ui="round"></lablup-shields>
        </div>
    `, root
    );
  }

  /**
   * Return elapsed time
   *
   * @param {any} start - start time
   * @param {any} end - end time
   * */
  _elapsed2(start, end) {
    return globalThis.backendaiclient.utils.elapsedTime(start, end);
  }

  /**
   * Render a resource.
   *
   * @param {DOMelement} root
   * @param {object} column (<vaadin-grid-column> element)
   * @param {object} rowData
   */
  resourceRenderer(root, column?, rowData?) {
    render(
      // language=HTML
      html`
        <div class="layout flex">
          <div class="layout horizontal center flex">
            <div class="layout horizontal start resource-indicator">
              <mwc-icon class="fg green">developer_board</mwc-icon>
              <span style="padding-left:5px;">${rowData.item.cpu_slots}</span>
              <span class="indicator">${_t("general.cores")}</span>
            </div>
            <span class="flex"></span>
            <lablup-progress-bar id="cpu-usage-bar" progress="${rowData.item.cpu_current_usage_ratio}"
                            buffer="${rowData.item.cpu_total_usage_ratio}"
                            description="${rowData.item.current_cpu_percent}%"></lablup-progress-bar>
          </div>
          <div class="layout horizontal center flex">
            <div class="layout horizontal start resource-indicator">
              <mwc-icon class="fg green">memory</mwc-icon>
              <span style="padding-left:5px;">${rowData.item.mem_slots}</span>
              <span class="indicator">GB</span>
            </div>
            <span class="flex"></span>
            <lablup-progress-bar id="mem-usage-bar" progress="${rowData.item.mem_current_usage_ratio}"
                            buffer="${rowData.item.mem_total_usage_ratio}"
                            description="${rowData.item.current_mem}GB"></lablup-progress-bar>

          </div>

        </div>`, root
    );
  }

  /**
   * Render a heartbeat status.
   *
   * @param {DOMelement} root
   * @param {object} column (<vaadin-grid-column> element)
   * @param {object} rowData
   */
  capabilitiesRenderer(root, column?, rowData?) {
    render(
      // language=HTML
      html`
        <div class="layout vertical start justified wrap">
          ${rowData.item.capabilities ? rowData.item.capabilities.map(item=>html`
          <lablup-shields app="" color="blue"
                          description="${item}" ui="round"></lablup-shields>
          `):html``}

        </div>`, root
    );
  }

  /**
   * Show detailed agent information as dialog form.
   *
   * @param {DOMelement} root
   * @param {object} column (<vaadin-grid-column> element)
   * @param {object} rowData
   */
  showAgentDetailDialog(agentId) {
    this.agentDetail = this.agentsObject[agentId];
    this.agentDetailDialog.show();
    return;
  }

  /**
   * Render control buttons such as assignment, build, add an alarm, pause and delete.
   *
   * @param {DOMelement} root
   * @param {object} column (<vaadin-grid-column> element)
   * @param {object} rowData
   */
  controlRenderer(root, column?, rowData?) {
    render(
      // language=HTML
      html`
        <div id="controls" class="layout horizontal flex center" agent-id="${rowData.item.addr}">
          <mwc-icon-button class="fg blue controls-running" icon="assignment" @click="${(e) => this.showAgentDetailDialog(rowData.item.id)}"></mwc-icon-button>
        </div>`, root
    );
  }

  _bytesToMB(value) {
    return Number(value / (1024 * 1024)).toFixed(1);
  }

  render() {
    // language=HTML
    return html`
      <vaadin-grid class="${this.condition}" theme="row-stripes column-borders compact" aria-label="Job list"
                   .items="${this.agents}">
        <vaadin-grid-column width="40px" flex-grow="0" header="#" text-align="center"
                            .renderer="${this._indexRenderer}"></vaadin-grid-column>
        <vaadin-grid-column width="80px" header="${_t("agent.Endpoint")}" .renderer="${this._boundEndpointRenderer}">
        </vaadin-grid-column>
        <vaadin-grid-column width="100px" resizable header="${_t("agent.BackendType")}"
                            .renderer="${this._boundTypeRenderer}">
        </vaadin-grid-column>
        <vaadin-grid-column resizable width="140px" header="${_t("agent.Resources")}"
                            .renderer="${this._boundResourceRenderer}">
        </vaadin-grid-column>
        <vaadin-grid-column width="130px" flex-grow="0" resizable header="${_t("agent.Capabilities")}"
                            .renderer="${this._boundCapabilitiesRenderer}"></vaadin-grid-column>
        <vaadin-grid-column resizable header="${_t("general.Control")}"
                            .renderer="${this._boundControlRenderer}"></vaadin-grid-column>
      </vaadin-grid>
      <backend-ai-dialog id="agent-detail" fixed backdrop blockscrolling persistent scrollable>
        <span slot="title">${_t("agent.DetailedInformation")}</span>
        <div slot="content">
          <div class="horizontal start start-justified layout">
          ${'cpu_util_live' in this.agentDetail ?
      html`<div>
              <h3>CPU</h3>
              <div class="horizontal wrap layout" style="max-width:600px;">
            ${this.agentDetail.cpu_util_live.map(item => html`
              <div class="horizontal start-justified center layout" style="padding:0 5px;">
                <div style="font-size:8px;width:35px;">CPU${item.num}</div>
                <lablup-progress-bar class="cpu"
                  progress="${item.pct / 100.0}"
                  description=""
                ></lablup-progress-bar>
              </div>`)}
              </div>
            </div>` : html``}
            <div style="margin-left:10px;">
              <h3>Memory</h3>
              <div>
                <lablup-progress-bar class="mem"
                  progress="${this.agentDetail.mem_current_usage_ratio}"
                  description="${this.agentDetail.current_mem}GB/${this.agentDetail.mem_slots}GB"
                ></lablup-progress-bar>
              </div>
              <h3>Network</h3>
              ${'live_stat' in this.agentDetail && 'node' in this.agentDetail.live_stat ? html`
              <div>TX: ${this._bytesToMB(this.agentDetail.live_stat.node.net_tx.current)}MB</div>
              <div>RX: ${this._bytesToMB(this.agentDetail.live_stat.node.net_rx.current)}MB</div>
              ` : html``}
            </div>
          </div>
        </div>
        <div slot="footer" class="horizontal end-justified flex layout">
          <mwc-button
              unelevated
              id="close-button"
              icon="check"
              label="${_t("button.Close")}"
              @click="${(e) => this._hideDialog(e)}"></mwc-button>
        </div>
      </backend-ai-dialog>
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "backend-ai-storage-proxy-list": BackendAIStorageProxyList;
  }
}
