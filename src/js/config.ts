import { Table } from "kintone-ui-component/lib/table";
import { Tooltip } from "kintone-ui-component/lib/tooltip";
import { Dropdown } from "kintone-ui-component/lib/dropdown";
import { TextArea } from "kintone-ui-component/lib/textarea";
import { Text } from "kintone-ui-component/lib/text";
import { Button } from "kintone-ui-component/lib/button";

const defaultConfig = [{ url: "", method: "GET", header: {}, body: {} }];

((PLUGIN_ID) => {
  const renderUrl = (cellData) => {
    return new Text({
      value: cellData,
    });
  };

  const renderMethod = (cellData) => {
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

  const renderHeader = (cellData) => {
    return new TextArea({
      value: cellData,
    });
  };

  const renderBody = (cellData) => {
    return new TextArea({
      value: cellData,
    });
  };

  const getProxyConfig = () => {
    const configData = kintone.plugin.app.getConfig(PLUGIN_ID);
    const parsedConfig = configData.config ? JSON.parse(configData.config) : [];

    return parsedConfig.map((s) => {
      const a = kintone.plugin.app.getProxyConfig(s.url, s.method);
      return {
        url: s.url,
        method: s.method,
        header: JSON.stringify(a.headers),
        body: JSON.stringify(a.data),
      };
    });
  };

  let tableData = [...getProxyConfig()];
  if (tableData.length === 0) {
    tableData.push({ url: "", method: "GET", header: "", body: "" });
  }

  const table = new Table({
    label: "Table",
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
          title: "送信したいBodyを入力してください",
          container: "Body",
        }),
        field: "body",
        render: renderBody,
      },
    ],
    data: tableData,
    actionButton: true,
    headerVisible: true,
    visible: true,
  });

  const formElement = document.querySelector("#form");
  formElement?.appendChild(table);

  table.addEventListener("change", (event) => {
    console.log("table", event);
    tableData = event.detail.data;
  });

  const button = new Button({
    text: "保存",
    type: "submit",
  });

  const setProxyConfig = (paramsOrigin) => {
    const setProxyConfigRecursive = (params) => {
      const [param, ...rest] = params;
      const { url, method, header, body } = param;
      if (params.length === 1) {
        kintone.plugin.app.setProxyConfig(url, method, header, body, () => {
          const config = paramsOrigin.map(({ url, method }) => ({
            url,
            method,
          }));
          kintone.plugin.app.setConfig({ config: JSON.stringify(config) });
        });
      }
      kintone.plugin.app.setProxyConfig(url, method, header, body, () => {
        setProxyConfigRecursive(rest);
      });
    };

    setProxyConfigRecursive(paramsOrigin);
  };

  button.addEventListener("click", () => {
    console.log("tabledata", tableData);
    if (tableData === "add-row") {
      tableData.push({ url: "", method: "GET", header: "", body: "" });
    }
    const adjested = tableData.map((data) => {
      const { body, header, method, url } = data;
      return {
        url,
        method,
        header: JSON.parse(header),
        body: JSON.parse(body),
      };
    });

    setProxyConfig(adjested);
    console.log("完了");
  });

  formElement?.appendChild(button);

  const pluginIdElement = document.querySelector("#plugin-id");
  if (pluginIdElement) {
    pluginIdElement.textContent = PLUGIN_ID;
  }
})(kintone.$PLUGIN_ID);
