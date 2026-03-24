const api = require("../../utils/api");

Page({
  data: {
    transactions: [],
    showForm: false,
    loading: true,
    form: {
      type: "income",
      amount: "",
      description: "",
      transactionDate: "",
      note: "",
    },
    txTypes: [
      { label: "收入", value: "income" },
      { label: "支出", value: "expense" },
      { label: "资产价值变动", value: "asset_value_change" },
      { label: "资产收益", value: "asset_income" },
      { label: "负债还款", value: "liability_repayment" },
      { label: "负债本金变动", value: "liability_principal_change" },
    ],
    typeIndex: 0,
  },

  onLoad() {
    const now = new Date();
    this.setData({
      "form.transactionDate": `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    });
    this.fetchTransactions();
  },

  onShow() {
    this.fetchTransactions();
  },

  fetchTransactions() {
    this.setData({ loading: true });
    api
      .request("/api/transactions?limit=50")
      .then((res) => {
        this.setData({ transactions: res, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  toggleForm() {
    this.setData({ showForm: !this.data.showForm });
  },

  onTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      typeIndex: index,
      "form.type": this.data.txTypes[index].value,
    });
  },

  onAmountInput(e) {
    this.setData({ "form.amount": e.detail.value });
  },

  onDescInput(e) {
    this.setData({ "form.description": e.detail.value });
  },

  onDateChange(e) {
    this.setData({ "form.transactionDate": e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ "form.note": e.detail.value });
  },

  submitForm() {
    const { form } = this.data;
    if (!form.amount || !form.description) {
      wx.showToast({ title: "请填写金额和描述", icon: "none" });
      return;
    }

    api
      .request("/api/transactions", {
        method: "POST",
        data: {
          type: form.type,
          amount: Number(form.amount),
          description: form.description,
          transactionDate: form.transactionDate,
          note: form.note,
        },
      })
      .then(() => {
        wx.showToast({ title: "记录成功", icon: "success" });
        this.setData({
          showForm: false,
          form: {
            type: "income",
            amount: "",
            description: "",
            transactionDate: this.data.form.transactionDate,
            note: "",
          },
          typeIndex: 0,
        });
        this.fetchTransactions();
      })
      .catch(() => {
        wx.showToast({ title: "记录失败", icon: "none" });
      });
  },

  deleteTransaction(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "确认删除",
      content: "确定要删除这条账目吗？",
      success: (res) => {
        if (res.confirm) {
          api
            .request(`/api/transactions?id=${id}`, { method: "DELETE" })
            .then(() => {
              wx.showToast({ title: "已删除", icon: "success" });
              this.fetchTransactions();
            });
        }
      },
    });
  },

  formatMoney(value) {
    return api.formatMoney(value);
  },

  formatDate(dateStr) {
    return api.formatDate(dateStr);
  },

  getTypeLabel(type) {
    return api.transactionTypeMap[type] || type;
  },

  getAmountClass(type) {
    if (["income", "asset_income"].includes(type)) return "text-green";
    if (["expense", "liability_repayment"].includes(type)) return "text-red";
    return "text-blue";
  },
});
