import { Table, Render } from "kintone-ui-component/lib/table";
import { Tooltip } from "kintone-ui-component/lib/tooltip";
import { Dropdown } from "kintone-ui-component/lib/dropdown";
import { TextArea } from "kintone-ui-component/lib/textarea";
import { Text } from "kintone-ui-component/lib/text";
import { Button } from "kintone-ui-component/lib/button";
import { Notification } from "kintone-ui-component/lib/notification";

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

const defaultConfig = [{ url: "", method: "GET", header: {}, data: {} }];
const renderUrl: Render = (cellData) => {
  return new Text({
    value: cellData,
  });
};

const renderMethod: Render = (cellData) => {
  const dropdown = new Dropdown({
    items: [
      { label: "GET", value: "GET" },
      { label: "POST", value: "POST" },
      { label: "PUT", value: "PUT" },
      { label: "DELETE", value: "DELETE" },
    ],
    selectedIndex: 0,
    requiredIcon: true,
    value: cellData,
  });
  return dropdown;
};

const renderHeader: Render = (cellData) => {
  return new TextArea({
    value: cellData,
  });
};

const renderdata: Render = (cellData) => {
  return new TextArea({
    value: cellData,
  });
};

const isConfigData = (data: any): data is SavedPluginConfigData => {
  return (
    typeof data === "object" && data !== null && typeof data.config === "string"
  );
};

const getProxyConfig = (pluginId: string) => {
  const configData = kintone.plugin.app.getConfig(pluginId);
  if (!isConfigData(configData)) {
    return [];
  }

  const parsedConfig = JSON.parse(configData.config) as Config;

  return parsedConfig.map((s) => {
    const proxyConfigData = kintone.plugin.app.getProxyConfig(
      s.url,
      s.method,
    ) as SavedProxyConfigData;
    return {
      url: s.url,
      method: s.method,
      header: JSON.stringify(proxyConfigData.headers),
      data: JSON.stringify(proxyConfigData.data),
    };
  });
};

const getDeleteProxyConfig = (pluginId: string, currentConfig: Config) => {
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
const setProxyConfig = (config: Config, callback: () => void) => {
  const setProxyConfigRecursive = (params: Config) => {
    const [param, ...rest] = params;
    const { url, method, header, data } = param;
    if (params.length === 1) {
      // 最後の要素の場合はcallbackを実行できるようにする
      kintone.plugin.app.setProxyConfig(url, method, header, data, callback);
    }
    kintone.plugin.app.setProxyConfig(url, method, header, data, () => {
      setProxyConfigRecursive(rest);
    });
  };

  setProxyConfigRecursive(config);
};

const validateConfig = (
  config: Config,
): { result: "err"; errors: Error[] } | { result: "ok" } => {
  const errors: Error[] = [];

  config.forEach(({ url, method, header, data }, i) => {
    if (!url || !method) {
      errors.push(new Error(`${i + 1}行目: URLとMethodは必須です。`));
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

((PLUGIN_ID) => {
  let tableData = [...getProxyConfig(PLUGIN_ID)];
  if (tableData.length === 0) {
    tableData.push({ url: "", method: "GET", header: "", data: "" });
  }

  const notification = new Notification({
    text: "",
    type: "danger",
    className: "options-class",
    duration: 8000,
    container: document.body,
  });

  const table = new Table({
    columns: [
      {
        title: new Tooltip({
          title: "接続先のURLを入力してください",
          container: "URL",
        }),
        field: "url",
        render: renderUrl,
      },
      {
        title: new Tooltip({
          title: "通信に利用するMethodを選択してください",
          container: "Method",
        }),
        field: "method",
        render: renderMethod,
      },
      {
        title: new Tooltip({
          title: "送信したいHeaderを入力してください",
          container: "Header",
        }),
        field: "header",
        render: renderHeader,
      },
      {
        title: new Tooltip({
          title: "送信したいdataを入力してください",
          container: "Data",
        }),
        field: "data",
        render: renderdata,
      },
    ],
    data: tableData,
    actionButton: true,
    headerVisible: true,
    visible: true,
    id: "setting-table",
  });

  const formElement = document.querySelector("#form");
  formElement?.appendChild(table);

  table.addEventListener("change", (event) => {
    console.log("table", event);
    // @ts-expect-error
    tableData = event.detail.data;
  });

  const button = new Button({
    text: "保存",
    type: "submit",
    id: "save-button",
  });

  button.addEventListener("click", () => {
    console.log("tabledata", tableData);

    const valid = validateConfig(tableData);
    if (valid.result === "err") {
      notification.text = valid.errors.map((e) => e.message).join("\n");
      notification.open();
      return;
    }
    // テーブルにはJSON文字列で保存されているため、JSON.parseを行う
    const parsedConfig = tableData.map((row) => {
      const { data, header, method, url } = row;
      return {
        url,
        method,
        header: JSON.parse(header),
        data: JSON.parse(data),
      };
    });

    // 削除されたものはProxyからも削除する処理をいれる
    // methodとURLが一致しないものは削除対象
    const deleteConfig = getDeleteProxyConfig(PLUGIN_ID, tableData);

    // これから設定しようとするデータ、削除対象のデータをマージしてsetProxyを行う
    setProxyConfig([...parsedConfig, ...deleteConfig], () => {
      const config = parsedConfig.map((pram) => ({
        url: pram.url,
        method: pram.method,
      }));
      // 最後にsetProxyの情報をconfigとして保存
      kintone.plugin.app.setConfig({ config: JSON.stringify(config) });
      console.log("完了");
    });
  });

  formElement?.appendChild(button);

  const pluginIdElement = document.querySelector("#plugin-id");
  if (pluginIdElement) {
    pluginIdElement.textContent = `プラグインID: ${PLUGIN_ID}`;
  }
})(kintone.$PLUGIN_ID);
