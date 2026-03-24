const api = require("../../utils/api");

Page({
  data: {
    assets: [],
    showForm: false,
    loading: true,
    form: {
      name: "",
      type: "deposit",
      currentValue: "",
      monthlyIncome: "0",
      annualYield: "0",
      note: "",
    },
    assetTypes: [
      { label: "房产", value: "real_estate" },
      { label: "存款", value: "deposit" },
      { label: "投资", value: "investment" },
      { label: "收入来源", value: "income_source" },
      { label: "其他", value: "other" },
    ],
    typeIndex: 1,
  },

  onLoad() {
    this.fetchAssets();
  },

  onShow() {
    this.fetchAssets();
  },

  fetchAssets() {
    this.setData({ loading: true });
    api
      .request("/api/assets")
      .then((res) => {
        this.setData({ assets: res, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  toggleForm() {
    this.setData({ showForm: !this.data.showForm });
  },

  onNameInput(e) {
    this.setData({ "form.name": e.detail.value });
  },

  onTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      typeIndex: index,
      "form.type": this.data.assetTypes[index].value,
    });
  },

  onValueInput(e) {
    this.setData({ "form.currentValue": e.detail.value });
  },

  onIncomeInput(e) {
    this.setData({ "form.monthlyIncome": e.detail.value });
  },

  onYieldInput(e) {
    this.setData({ "form.annualYield": e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ "form.note": e.detail.value });
  },

  submitForm() {
    const { form } = this.data;
    if (!form.name || !form.currentValue) {
      wx.showToast({ title: "请填写必要信息", icon: "none" });
      return;
    }

    api
      .request("/api/assets", {
        method: "POST",
        data: {
          name: form.name,
          type: form.type,
          currentValue: Number(form.currentValue),
          monthlyIncome: Number(form.monthlyIncome),
          annualYield: Number(form.annualYield),
          note: form.note,
        },
      })
      .then(() => {
        wx.showToast({ title: "添加成功", icon: "success" });
        this.setData({
          showForm: false,
          form: {
            name: "",
            type: "deposit",
            currentValue: "",
            monthlyIncome: "0",
            annualYield: "0",
            note: "",
          },
          typeIndex: 1,
        });
        this.fetchAssets();
      })
      .catch(() => {
        wx.showToast({ title: "添加失败", icon: "none" });
      });
  },

  deleteAsset(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "确认删除",
      content: "确定要删除这项资产吗？",
      success: (res) => {
        if (res.confirm) {
          api.request(`/api/assets?id=${id}`, { method: "DELETE" }).then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.fetchAssets();
          });
        }
      },
    });
  },

  formatMoney(value) {
    return api.formatMoney(value);
  },

  getTypeLabel(type) {
    return api.assetTypeMap[type] || type;
  },
});
