const api = require("../../utils/api");

Page({
  data: {
    activeTab: "prediction",
    prediction: null,
    snapshots: [],
    predictionMonths: 12,
    loading: true,
  },

  onLoad() {
    this.fetchPrediction();
  },

  onShow() {
    if (this.data.activeTab === "prediction") {
      this.fetchPrediction();
    } else {
      this.fetchSnapshots();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab, loading: true });
    if (tab === "prediction") {
      this.fetchPrediction();
    } else {
      this.fetchSnapshots();
    }
  },

  onMonthsChange(e) {
    const months = [6, 12, 24, 36][e.detail.value];
    this.setData({ predictionMonths: months, loading: true });
    this.fetchPrediction();
  },

  fetchPrediction() {
    api
      .request(`/api/statistics/prediction?months=${this.data.predictionMonths}`)
      .then((res) => {
        this.setData({ prediction: res, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  fetchSnapshots() {
    api
      .request("/api/statistics/monthly")
      .then((res) => {
        this.setData({ snapshots: res, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  generateSnapshot() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    api
      .request("/api/statistics/monthly", {
        method: "POST",
        data: { month },
      })
      .then(() => {
        wx.showToast({ title: "快照已生成", icon: "success" });
        this.fetchSnapshots();
      });
  },

  formatMoney(value) {
    return api.formatMoney(value);
  },
});
