import React from 'react'
import Rx from 'rxjs';

import {bindAll} from 'lodash';

import ObservablesClient from 'rxremote/observables_client';
import bindComponentToObservables from './bindComponentToObservables';

const observablesClient = new ObservablesClient();

class ChatStatsTable extends React.Component {
  render() {
    return (
      <table>
        <thead>
          <tr>
            <th>Channel name</th>
            <th>Created at</th>
            <th>Last message</th>
            <th>Message count</th>
            <th>Online count</th>
          </tr>
        </thead>
        <tbody>
        {
          this.props.channelStats.map((stats, i) => (
            <tr key={i}>
              <td>{stats.name}</td>
              <td>{stats.createdAt}</td>
              <td>{stats.lastMessage}</td>
              <td>{stats.messageCount}</td>
              <td>{stats.onlineCount}</td>
            </tr>
          ))
        }
        </tbody>
      </table>
    );
  }
}


export default class AdminApp extends React.Component {
  componentWillMount() {
    this.ChatStatsTable = bindComponentToObservables(
        ChatStatsTable, {channelStats: observablesClient.observable('channel-stats').startWith([])}
    );
  }
  render() {
    return (<this.ChatStatsTable />);
  }
}
