const api = require("../../utils/api");

Page({
  data: {
    liabilities: [],
    showForm: false,
    loading: true,
    form: {
      name: "",
      type: "mortgage",
      totalPrincipal: "",
      remainingPrincipal: "",
      annualRate: "",
      monthlyPayment: "",
      note: "",
    },
    liabilityTypes: [
      { label: "房贷", value: "mortgage" },
      { label: "车贷", value: "car_loan" },
      { label: "信用卡", value: "credit_card" },
      { label: "个人贷款", value: "personal_loan" },
      { label: "其他", value: "other" },
    ],
    typeIndex: 0,
  },

  onLoad() {
    this.fetchLiabilities();
  },

  onShow() {
    this.fetchLiabilities();
  },

  fetchLiabilities() {
    this.setData({ loading: true });
    api
      .request("/api/liabilities")
      .then((res) => {
        this.setData({ liabilities: res, loading: false });
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
      "form.type": this.data.liabilityTypes[index].value,
    });
  },

  onTotalPrincipalInput(e) {
    this.setData({ "form.totalPrincipal": e.detail.value });
  },

  onRemainingInput(e) {
    this.setData({ "form.remainingPrincipal": e.detail.value });
  },

  onRateInput(e) {
    this.setData({ "form.annualRate": e.detail.value });
  },

  onPaymentInput(e) {
    this.setData({ "form.monthlyPayment": e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ "form.note": e.detail.value });
  },

  submitForm() {
    const { form } = this.data;
    if (!form.name || !form.totalPrincipal) {
      wx.showToast({ title: "请填写必要信息", icon: "none" });
      return;
    }

    api
      .request("/api/liabilities", {
        method: "POST",
        data: {
          name: form.name,
          type: form.type,
          totalPrincipal: Number(form.totalPrincipal),
          remainingPrincipal: Number(form.remainingPrincipal || form.totalPrincipal),
          annualRate: Number(form.annualRate),
          monthlyPayment: Number(form.monthlyPayment),
          note: form.note,
        },
      })
      .then(() => {
        wx.showToast({ title: "添加成功", icon: "success" });
        this.setData({
          showForm: false,
          form: {
            name: "",
            type: "mortgage",
            totalPrincipal: "",
            remainingPrincipal: "",
            annualRate: "",
            monthlyPayment: "",
            note: "",
          },
          typeIndex: 0,
        });
        this.fetchLiabilities();
      })
      .catch(() => {
        wx.showToast({ title: "添加失败", icon: "none" });
      });
  },

  deleteLiability(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "确认删除",
      content: "确定要删除这项负债吗？",
      success: (res) => {
        if (res.confirm) {
          api
            .request(`/api/liabilities?id=${id}`, { method: "DELETE" })
            .then(() => {
              wx.showToast({ title: "已删除", icon: "success" });
              this.fetchLiabilities();
            });
        }
      },
    });
  },

  formatMoney(value) {
    return api.formatMoney(value);
  },

  getTypeLabel(type) {
    return api.liabilityTypeMap[type] || type;
  },
});
