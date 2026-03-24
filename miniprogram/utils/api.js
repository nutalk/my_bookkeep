const app = getApp();

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${path}`,
      method: options.method || "GET",
      data: options.data,
      header: {
        "Content-Type": "application/json",
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: reject,
    });
  });
}

function formatMoney(value) {
  if (value === null || value === undefined) return "¥0.00";
  return `¥${Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const assetTypeMap = {
  real_estate: "房产",
  deposit: "存款",
  investment: "投资",
  income_source: "收入来源",
  other: "其他",
};

const liabilityTypeMap = {
  mortgage: "房贷",
  car_loan: "车贷",
  credit_card: "信用卡",
  personal_loan: "个人贷款",
  other: "其他",
};

const transactionTypeMap = {
  asset_value_change: "资产价值变动",
  asset_income: "资产收益",
  liability_repayment: "负债还款",
  liability_principal_change: "负债本金变动",
  expense: "支出",
  income: "收入",
  transfer: "转账",
  reconciliation: "对账调整",
};

module.exports = {
  request,
  formatMoney,
  formatDate,
  assetTypeMap,
  liabilityTypeMap,
  transactionTypeMap,
};
