const api = require("../../utils/api");

Page({
  data: {
    overview: {
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      monthlyCashFlow: 0,
      assetCount: 0,
      liabilityCount: 0,
    },
    assets: [],
    liabilities: [],
    loading: true,
  },

  onLoad() {
    this.fetchData();
  },

  onShow() {
    this.fetchData();
  },

  fetchData() {
    this.setData({ loading: true });
    api
      .request("/api/statistics/snapshot")
      .then((res) => {
        this.setData({
          overview: res.overview,
          assets: res.assets,
          liabilities: res.liabilities,
          loading: false,
        });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  formatMoney(value) {
    return api.formatMoney(value);
  },
});
