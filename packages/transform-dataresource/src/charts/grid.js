import * as React from "react";
import VirtualizedGrid from "../virtualized-grid";
import ReactTable from "react-table";
import ReactTableStyles from "../css/react-table";
import withFixedColumns from "react-table-hoc-fixed-columns";
const ReactTableFixedColumns = withFixedColumns(ReactTable);

export const DataResourceTransformGrid = ({
  data: { data, schema },
  theme,
  expanded,
  height
}) => {
  console.log("data, schema", data, schema, theme, height, expanded);
  const tableColumns = schema.fields.map((f, i) => ({
    Header: f.name,
    accessor: f.name,
    fixed: i === 0 && "left"
  }));

  console.log("theme", theme);
  return (
    <div style={{ width: "calc(100vw - 150px)" }}>
      <ReactTableFixedColumns
        data={data}
        columns={tableColumns}
        style={{
          height: "400px"
        }}
        className="-striped -highlight"
      />
      <style global jsx>
        {ReactTableStyles}
      </style>
    </div>
  );
  return (
    <VirtualizedGrid
      data={data}
      schema={schema}
      theme={theme}
      expanded={expanded}
      height={height}
      // style={{ marginRight: "10px" }}
    />
  );
};
