App({
  globalData: {
    baseUrl: "", // 替换为实际后端地址
  },

  onLaunch() {
    const accountInfo = wx.getAccountInfoSync();
    if (accountInfo.miniProgram.envVersion === "release") {
      this.globalData.baseUrl = "https://your-production-domain.com";
    } else {
      this.globalData.baseUrl = "http://localhost:3000";
    }
  },
});
