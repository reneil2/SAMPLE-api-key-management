// Cliend side Config
type Config = Array<{
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  header: string;
  data: string;
}>;

// 保存されているプラグイン設定データ
type SavedPluginConfigData = {
  config: string;
};

// 保存されているプロキシ設定データ
type SavedProxyConfigData = {
  headers: object;
  data: object;
};
