// 想定されるConfigの型かをチェック
export const isConfigData = (data: unknown): data is SavedPluginConfigData => {
  return (
    typeof data === "object" &&
    data !== null &&
    "config" in data &&
    data.config !== null &&
    typeof data.config === "string"
  );
};

// ProxyConfigを取得し、Config型に変換する
export const getProxyConfig = (pluginId: string): Config => {
  const configData = kintone.plugin.app.getConfig(pluginId);
  if (!isConfigData(configData)) {
    return [];
  }

  const parsedConfig = JSON.parse(configData.config) as Config;

  return parsedConfig
    .map((s) => {
      const proxyConfigData = kintone.plugin.app.getProxyConfig(
        s.url,
        s.method,
      ) as SavedProxyConfigData | null;

      if (!proxyConfigData) {
        return null;
      }
      return {
        url: s.url,
        method: s.method,
        header: JSON.stringify(proxyConfigData.headers, null, 2),
        data: JSON.stringify(proxyConfigData.data, null, 2),
      };
    })
    .filter((s) => s !== null);
};

export const getDeleteProxyConfig = (
  pluginId: string,
  currentConfig: Config,
) => {
  const prevConfig = getProxyConfig(pluginId);

  // currentConfigのデータと比較して削除対象を取得
  const deleteTargets = prevConfig
    .filter((prev) => {
      return !currentConfig.some(
        (current) => current.url === prev.url && current.method === prev.method,
      );
    })
    // 削除対象は空オブジェクトにする
    .map((d) => ({ url: d.url, method: d.method, header: {}, data: {} }));

  return deleteTargets;
};

// ProxyConfigは一つずつしか設定できないため、再帰的に行えるようにする
export const setProxyConfig = (config: Config, callback: () => void) => {
  const setProxyConfigRecursive = (params: Config) => {
    const [param, ...rest] = params;
    const { url, method, header, data } = param;
    if (params.length === 1) {
      // 最後の要素の場合はcallbackを実行できるようにする
      kintone.plugin.app.setProxyConfig(url, method, header, data, callback);
    }

    kintone.plugin.app.setProxyConfig(url, method, header, data, () => {
      setTimeout(() => {
        setProxyConfigRecursive(rest);
      }, 100); // DBがロックされる可能性があるのでスリープを挟む
    });
  };

  setProxyConfigRecursive(config);
};

export const validateConfig = (
  config: Config,
): { result: "err"; errors: Error[] } | { result: "ok" } => {
  const errors: Error[] = [];

  config.forEach(({ url, method, header, data }, i) => {
    if (!url) {
      errors.push(new Error(`${i + 1}行目: URLは必須です。`));
    }
    if (!method) {
      errors.push(new Error(`${i + 1}行目: Methodは必須です。`));
    }
    try {
      JSON.parse(header);
    } catch (e) {
      errors.push(
        new Error(`${i + 1}行目: HeaderのJSON形式が正しくありません。`),
      );
    }
    try {
      JSON.parse(data);
    } catch (e) {
      errors.push(
        new Error(`${i + 1}行目: dataのJSON形式が正しくありません。`),
      );
    }
  });

  if (errors.length > 0) {
    return { result: "err", errors };
  }

  return { result: "ok" };
};
