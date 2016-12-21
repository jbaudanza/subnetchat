import React from 'react'
import Rx from 'rxjs';

import {bindAll} from 'lodash';

import ObservablesClient from 'rxremote/observables_client';
import bindComponentToObservables from './bindComponentToObservables';

const observablesClient = new ObservablesClient();


class ChatRoomStatsTable extends React.Component {
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


class SessionStatsTable extends React.Component {
  render() {
    return (
      <table>
        <thead>
          <tr>
            <th>IP Address</th>
            <th>Connected at</th>
            <th>Last message</th>
            <th>Identity</th>
            <th>Channel</th>
            <th>Message count</th>
          </tr>
        </thead>
        <tbody>
        {
          this.props.sessionStats.map((stats, i) => (
            <tr key={i}>
              <td>{stats.sessionId}</td>
              <td>{stats.timestamp}</td>
              <td>{stats.ipAddress}</td>
              <td>{stats.lastMessage}</td>
              <td>{stats.identity}</td>
              <td>{stats.messageCount}</td>
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
    this.ChatRoomStatsTable = bindComponentToObservables(
        ChatRoomStatsTable, {channelStats: observablesClient.observable('channel-stats').startWith([])}
    );

    this.SessionStatsTable = bindComponentToObservables(
        SessionStatsTable, {sessionStats: observablesClient.observable('session-stats').startWith([])}
    )
  }
  render() {
    return (
      <div>
        <this.ChatRoomStatsTable />
        <this.SessionStatsTable />
      </div>
    );
  }
}
