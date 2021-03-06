// @flow

import React, { Component } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { connect } from 'react-redux';

import { appNavigate } from '../../app';
import { getURLWithoutParamsNormalized } from '../../base/connection';
import { Icon } from '../../base/font-icons';
import { getLocalizedDateFormatter, translate } from '../../base/i18n';
import { ASPECT_RATIO_NARROW } from '../../base/responsive-ui';

import styles from './styles';

const ALERT_MILLISECONDS = 5 * 60 * 1000;

type Props = {

    /**
     * The current aspect ratio of the screen.
     */
    _aspectRatio: Symbol,

    /**
     * The URL of the current conference without params.
     */
    _currentConferenceURL: string,

    /**
     * The calendar event list.
     */
    _eventList: Array<Object>,

    /**
     * The Redux dispatch function.
     */
    dispatch: Function,

    /**
     * The translate function.
     */
    t: Function
};

type State = {

    /**
     * The event object to display the notification for.
     */
    event?: Object
};

/**
 * Component to display a permanent badge-like notification on the conference
 * screen when another meeting is about to start.
 */
class ConferenceNotification extends Component<Props, State> {
    updateIntervalId: number;

    /**
     * Constructor of the ConferenceNotification component.
     *
     * @inheritdoc
     */
    constructor(props) {
        super(props);

        this.state = {
            event: undefined
        };

        this._getNotificationContentStyle
            = this._getNotificationContentStyle.bind(this);
        this._getNotificationPosition
            = this._getNotificationPosition.bind(this);
        this._maybeDisplayNotification
            = this._maybeDisplayNotification.bind(this);
        this._onGoToNext = this._onGoToNext.bind(this);
    }

    /**
     * Implements React Component's componentDidMount.
     *
     * @inheritdoc
     */
    componentDidMount() {
        this.updateIntervalId = setInterval(
            this._maybeDisplayNotification,
            10 * 1000
        );
    }

    /**
     * Implements React Component's componentWillUnmount.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        clearTimeout(this.updateIntervalId);
    }

    /**
     * Implements the React Components's render.
     *
     * @inheritdoc
     */
    render() {
        const { event } = this.state;
        const { t } = this.props;

        if (event) {
            return (
                <View
                    style = { [
                        styles.notificationContainer,
                        this._getNotificationPosition()
                    ] } >
                    <View
                        style = { this._getNotificationContentStyle() }>
                        <TouchableOpacity
                            onPress = { this._onGoToNext } >
                            <View style = { styles.touchableView }>
                                <View
                                    style = {
                                        styles.notificationTextContainer
                                    }>
                                    <Text style = { styles.notificationText }>
                                        { t('calendarSync.nextMeeting') }
                                    </Text>
                                    <Text style = { styles.notificationText }>
                                        {
                                            getLocalizedDateFormatter(
                                                event.startDate
                                            ).fromNow()
                                        }
                                    </Text>
                                </View>
                                <View
                                    style = {
                                        styles.notificationIconContainer
                                    }>
                                    <Icon
                                        name = 'navigate_next'
                                        style = { styles.notificationIcon } />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return null;
    }

    _getNotificationContentStyle: () => Array<Object>

    /**
     * Decides the color of the notification and some additional
     * styles based on notificationPosition.
     *
     * @private
     * @returns {Array<Object>}
     */
    _getNotificationContentStyle() {
        const { event } = this.state;
        const { _aspectRatio } = this.props;
        const now = Date.now();
        const style = [
            styles.notificationContent
        ];

        if (event && event.startDate < now && event.endDate > now) {
            style.push(styles.notificationContentPast);
        } else {
            style.push(styles.notificationContentNext);
        }

        if (_aspectRatio === ASPECT_RATIO_NARROW) {
            style.push(styles.notificationContentSide);
        } else {
            style.push(styles.notificationContentTop);
        }

        return style;
    }

    _getNotificationPosition: () => Object;

    /**
     * Decides the position of the notification.
     *
     * @private
     * @returns {Object}
     */
    _getNotificationPosition() {
        const { _aspectRatio } = this.props;

        if (_aspectRatio === ASPECT_RATIO_NARROW) {
            return styles.notificationContainerSide;
        }

        return styles.notificationContainerTop;
    }

    _maybeDisplayNotification: () => void;

    /**
     * Periodically checks if there is an event in the calendar for which we
     * need to show a notification.
     *
     * @private
     * @returns {void}
     */
    _maybeDisplayNotification() {
        const { _currentConferenceURL, _eventList } = this.props;
        let eventToShow;

        if (_eventList && _eventList.length) {
            const now = Date.now();

            for (const event of _eventList) {
                const eventUrl
                    = getURLWithoutParamsNormalized(new URL(event.url));

                if (eventUrl !== _currentConferenceURL) {
                    if ((!eventToShow
                                && event.startDate > now
                                && event.startDate < now + ALERT_MILLISECONDS)
                            || (event.startDate < now && event.endDate > now)) {
                        eventToShow = event;
                    }
                }
            }
        }

        this.setState({
            event: eventToShow
        });
    }

    _onGoToNext: () => void;

    /**
     * Opens the meeting URL that the notification shows.
     *
     * @param {string} url - The URL to open.
     * @private
     * @returns {void}
     */
    _onGoToNext() {
        const { event } = this.state;

        if (event && event.url) {
            this.props.dispatch(appNavigate(event.url));
        }
    }
}

/**
 * Maps redux state to component props.
 *
 * @param {Object} state - The redux state.
 * @returns {{
 *     _aspectRatio: Symbol,
 *     _currentConferenceURL: string,
 *     _eventList: Array
 * }}
 */
export function _mapStateToProps(state: Object) {
    const { locationURL } = state['features/base/connection'];

    return {
        _aspectRatio: state['features/base/responsive-ui'].aspectRatio,
        _currentConferenceURL:
            locationURL ? getURLWithoutParamsNormalized(locationURL) : '',
        _eventList: state['features/calendar-sync'].events
    };
}

export default translate(connect(_mapStateToProps)(ConferenceNotification));
