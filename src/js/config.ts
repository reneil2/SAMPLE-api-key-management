import { Table, Render } from "kintone-ui-component/lib/table";
import { Tooltip } from "kintone-ui-component/lib/tooltip";
import { Dropdown } from "kintone-ui-component/lib/dropdown";
import { TextArea } from "kintone-ui-component/lib/textarea";
import { Text } from "kintone-ui-component/lib/text";
import { Button } from "kintone-ui-component/lib/button";
import { Notification } from "kintone-ui-component/lib/notification";
import {
  getProxyConfig,
  getDeleteProxyConfig,
  setProxyConfig,
  validateConfig,
} from "./utils";

const renderUrl: Render = (cellData) => {
  return new Text({
    value: cellData,
    placeholder: "https://example.com",
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
    placeholder: JSON.stringify({ key1: "value1", key2: "value2" }, null, 2),
  });
};

const renderdata: Render = (cellData) => {
  return new TextArea({
    value: cellData,
    placeholder: JSON.stringify({ key1: "value1", key2: "value2" }, null, 2),
  });
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
