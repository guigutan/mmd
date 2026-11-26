export const templates = {
  flowchart: {
    name: "流程图",
    code: `flowchart LR
    A([一个好想法]) --> B[实时编辑与预览]
    B --> C{选择导出格式}
    C --> D[SVG 矢量图]
    C --> E[PNG 高清图]

    %% 试着修改上面的文字
    %% 右侧图表会自动更新
    style A fill:#ede9fe,stroke:#8b7fe8
    style E fill:#ede9fe,stroke:#8b7fe8`,
  },
  sequence: {
    name: "时序图",
    code: `sequenceDiagram
    autonumber
    actor U as 用户
    participant A as 应用
    participant S as 服务
    U->>A: 发起请求
    A->>S: 获取数据
    S-->>A: 返回结果
    A-->>U: 展示内容`,
  },
  state: {
    name: "状态图",
    code: `stateDiagram-v2
    [*] --> 草稿
    草稿 --> 审核中: 提交
    审核中 --> 草稿: 修改
    审核中 --> 已发布: 通过
    已发布 --> 已归档: 归档
    已归档 --> [*]`,
  },
  er: {
    name: "实体关系图",
    code: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ITEM : contains
    USER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        date created_at
    }
    ITEM {
        int id PK
        string title
        float price
    }`,
  },
};
