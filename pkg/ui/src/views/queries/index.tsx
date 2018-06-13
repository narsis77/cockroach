import _ from "lodash";
import React from "react";
import Helmet from "react-helmet";
import { connect } from "react-redux";

import Loading from "src/views/shared/components/loading";
import spinner from "assets/spinner.gif";
import { CachedDataReducerState } from "src/redux/cachedDataReducer";
import { AdminUIState } from "src/redux/state";
import { Duration } from "src/util/format";
import { FixLong } from "src/util/fixLong";
import Print from "src/views/reports/containers/range/print";
import { ColumnDescriptor, SortedTable } from "src/views/shared/components/sortedtable";
import { SortSetting } from "src/views/shared/components/sortabletable";
import { refreshQueries } from "src/redux/apiReducers";
import { QueriesResponseMessage } from "src/util/api";
import { summarize, StatementSummary } from "src/util/sql/summarize";

import * as protos from "src/js/protos";
import "./queries.styl";

type CollectedStatementStatistics$Properties = protos.cockroach.sql.CollectedStatementStatistics$Properties;

class QueriesSortedTable extends SortedTable<CollectedStatementStatistics$Properties> {}

interface QueriesPageProps {
  queries: CachedDataReducerState<QueriesResponseMessage>;
  refreshQueries: typeof refreshQueries;
}

interface QueriesPageState {
  sortSetting: SortSetting;
}

function StatementSummary(props: { query: string }) {
  const summary = summarize(props.query);

  return (
    <div title={ props.query }>{ shortStatement(summary, props.query) }</div>
  );
}

function shortStatement(summary: StatementSummary, original: string) {
  switch (summary.statement) {
    case "update": return "UPDATE " + summary.table;
    case "insert": return "INSERT INTO " + summary.table;
    case "select": return "SELECT FROM " + summary.table;
    case "delete": return "DELETE FROM " + summary.table;
    default: return original;
  }
}

const QUERIES_COLUMNS: ColumnDescriptor<CollectedStatementStatistics$Properties>[] = [
  {
    title: "Query",
    className: "queries-table__col-query-text",
    cell: (query) => <StatementSummary query={ query.key.query } />,
    sort: (query) => query.key.query,
  },
  {
    title: "Count",
    cell: (query) => FixLong(query.stats.count).toInt(),
    sort: (query) => FixLong(query.stats.count).toInt(),
  },
  {
    title: "Avg Rows",
    cell: (query) => Math.round(query.stats.num_rows.mean),
    sort: (query) => query.stats.num_rows.mean,
  },
  {
    title: "Avg Latency",
    cell: (query) => Duration(query.stats.service_lat.mean * 1e9),
    sort: (query) => query.stats.service_lat.mean,
  },
];

class QueriesPage extends React.Component<QueriesPageProps, QueriesPageState> {

  constructor(props: QueriesPageProps) {
    super(props);
    this.state = {
      sortSetting: {
        sortKey: 1,
        ascending: false,
      },
    };
  }

  changeSortSetting = (ss: SortSetting) => {
    this.setState({
      sortSetting: ss,
    });
  }

  componentWillMount() {
    this.props.refreshQueries();
  }

  componentWillReceiveProps() {
    this.props.refreshQueries();
  }

  renderQueries() {
    if (!this.props.queries.data) {
      // This should really be handled by a loader component.
      return null;
    }
    const { queries, last_reset } = this.props.queries.data;

    return (
      <div className="queries-screen">
        <span className="queries-screen__last-hour-note">
          {queries.length} query fingerprints.
          Query history is only maintained for about an hour.
          History last cleared {Print.Timestamp(last_reset)}.
        </span>

        <QueriesSortedTable
          className="queries-table"
          data={queries}
          columns={QUERIES_COLUMNS}
          sortSetting={this.state.sortSetting}
          onChangeSortSetting={this.changeSortSetting}
        />
      </div>
    );
  }

  render() {
    return (
      <section className="section" style={{ maxWidth: "none" }}>
        <Helmet>
          <title>Queries</title>
        </Helmet>

        <h1 style={{ marginBottom: 20 }}>Queries</h1>

        <Loading
          loading={_.isNil(this.props.queries.data)}
          className="loading-image loading-image__spinner"
          image={spinner}
        >
          {this.renderQueries()}
        </Loading>
      </section>
    );
  }

}

// tslint:disable-next-line:variable-name
const QueriesPageConnected = connect(
  (state: AdminUIState) => ({
    queries: state.cachedData.queries,
  }),
  {
    refreshQueries,
  },
)(QueriesPage);

export default QueriesPageConnected;
