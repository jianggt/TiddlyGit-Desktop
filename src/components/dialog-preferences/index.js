/* eslint-disable consistent-return */
import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import semver from 'semver';
import fromUnixTime from 'date-fns/fromUnixTime';
import setYear from 'date-fns/setYear';
import setMonth from 'date-fns/setMonth';
import setDate from 'date-fns/setDate';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';

import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

import BuildIcon from '@material-ui/icons/Build';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import CodeIcon from '@material-ui/icons/Code';
import ExtensionIcon from '@material-ui/icons/Extension';
import LanguageIcon from '@material-ui/icons/Language';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import NotificationsIcon from '@material-ui/icons/Notifications';
import PowerIcon from '@material-ui/icons/Power';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import RouterIcon from '@material-ui/icons/Router';
import SecurityIcon from '@material-ui/icons/Security';
import StorefrontIcon from '@material-ui/icons/Storefront';
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
import WidgetsIcon from '@material-ui/icons/Widgets';
import GitHubIcon from '@material-ui/icons/GitHub';
import MenuBookIcon from '@material-ui/icons/MenuBook';

import { TimePicker } from '@material-ui/pickers';

import connectComponent from '../../helpers/connect-component';

import StatedMenu from '../shared/stated-menu';

import hunspellLanguagesMap from '../../constants/hunspell-languages';

import webcatalogLogo from '../../images/webcatalog-logo.svg';
import translatiumLogo from '../../images/translatium-logo.svg';
import singleboxLogo from '../../images/singlebox-logo.svg';

import ListItemDefaultMailClient from './list-item-default-mail-client';
import ListItemDefaultBrowser from './list-item-default-browser';

import {
  requestCheckForUpdates,
  requestClearBrowsingData,
  requestOpen,
  requestQuit,
  requestRealignActiveWorkspace,
  requestResetPreferences,
  requestSetPreference,
  requestSetSystemPreference,
  requestShowAboutWindow,
  requestShowCodeInjectionWindow,
  requestShowCustomUserAgentWindow,
  requestShowNotification,
  requestShowNotificationsWindow,
  requestShowProxyWindow,
  requestShowRequireRestartDialog,
  requestShowSpellcheckLanguagesWindow,
  getLogFolderPath,
} from '../../senders';

const styles = theme => ({
  root: {
    padding: theme.spacing(2),
    background: theme.palette.background.default,
  },
  sectionTitle: {
    paddingLeft: theme.spacing(2),
  },
  paper: {
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(3),
    border: theme.palette.type === 'dark' ? 'none' : '1px solid rgba(0, 0, 0, 0.12)',
  },
  timePickerContainer: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    display: 'flex',
    justifyContent: 'space-around',
  },
  secondaryEllipsis: {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  sidebar: {
    position: 'fixed',
    width: 200,
    color: theme.palette.text.primary,
  },
  inner: {
    width: '100%',
    maxWidth: 550,
    float: 'right',
  },
  logo: {
    height: 28,
  },
  link: {
    cursor: 'pointer',
    fontWeight: 500,
    outline: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
    '&:focus': {
      textDecoration: 'underline',
    },
  },
  sliderContainer: {
    paddingLeft: theme.spacing(5),
    paddingRight: theme.spacing(5),
  },
  sliderTitleContainer: {
    paddingTop: `${theme.spacing(1.5)}px !important`,
    width: 100,
  },
  sliderMarkLabel: {
    fontSize: '0.75rem',
  },
});

const getThemeString = theme => {
  if (theme === 'light') return 'Light';
  if (theme === 'dark') return 'Dark';
  return 'System default';
};

const getOpenAtLoginString = openAtLogin => {
  // eslint-disable-next-line sonarjs/no-duplicate-string
  if (openAtLogin === 'yes-hidden') return 'Yes, but minimized';
  if (openAtLogin === 'yes') return 'Yes';
  return 'No';
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

const getUpdaterDesc = (status, info) => {
  // eslint-disable-next-line sonarjs/no-duplicate-string
  if (status === 'download-progress') {
    if (info !== null) {
      const { transferred, total, bytesPerSecond } = info;
      return `Downloading updates (${formatBytes(transferred)}/${formatBytes(total)} at ${formatBytes(
        bytesPerSecond,
      )}/s)...`;
    }
    return 'Downloading updates...';
  }
  if (status === 'checking-for-update') {
    return 'Checking for updates...';
  }
  if (status === 'update-available') {
    return 'Downloading updates...';
  }
  if (status === 'update-downloaded') {
    if (info && info.version) return `A new version (${info.version}) has been downloaded.`;
    return 'A new version has been downloaded.';
  }
};

const Preferences = ({
  allowNodeInJsCodeInjection,
  allowPrerelease,
  askForDownloadPath,
  attachToMenubar,
  blockAds,
  classes,
  cssCodeInjection,
  customUserAgent,
  darkReader,
  darkReaderBrightness,
  darkReaderContrast,
  darkReaderGrayscale,
  darkReaderSepia,
  downloadPath,
  hibernateUnusedWorkspacesAtLaunch,
  hideMenuBar,
  ignoreCertificateErrors,
  jsCodeInjection,
  navigationBar,
  openAtLogin,
  pauseNotificationsBySchedule,
  pauseNotificationsByScheduleFrom,
  pauseNotificationsByScheduleTo,
  pauseNotificationsMuteAudio,
  rememberLastPageVisited,
  shareWorkspaceBrowsingData,
  sidebar,
  sidebarShortcutHints,
  spellcheck,
  spellcheckLanguages,
  swipeToNavigate,
  syncDebounceInterval,
  themeSource,
  titleBar,
  unreadCountBadge,
  updaterInfo,
  updaterStatus,
  useHardwareAcceleration,
  userName,
}) => {
  const { t } = useTranslation();

  const sections = {
    wiki: {
      text: 'Wiki',
      Icon: MenuBookIcon,
      ref: useRef(),
    },
    sync: {
      text: t('Preference.Sync'),
      Icon: GitHubIcon,
      ref: useRef(),
    },
    general: {
      text: t('Preference.General'),
      Icon: WidgetsIcon,
      ref: useRef(),
    },
    extensions: {
      text: 'Extensions',
      Icon: ExtensionIcon,
      ref: useRef(),
    },
    notifications: {
      text: 'Notifications',
      Icon: NotificationsIcon,
      ref: useRef(),
    },
    languages: {
      text: 'Languages',
      Icon: LanguageIcon,
      ref: useRef(),
    },
    downloads: {
      text: 'Downloads',
      Icon: CloudDownloadIcon,
      ref: useRef(),
    },
    network: {
      text: 'Network',
      Icon: RouterIcon,
      ref: useRef(),
    },
    privacy: {
      text: 'Privacy & Security',
      Icon: SecurityIcon,
      ref: useRef(),
    },
    system: {
      text: 'System',
      Icon: BuildIcon,
      ref: useRef(),
    },
    developers: {
      text: 'Developers',
      Icon: CodeIcon,
      ref: useRef(),
    },
    advanced: {
      text: t('Preference.Advanced'),
      Icon: PowerIcon,
      ref: useRef(),
    },
    updates: {
      text: 'Updates',
      Icon: SystemUpdateAltIcon,
      ref: useRef(),
    },
    reset: {
      text: 'Reset',
      Icon: RotateLeftIcon,
      ref: useRef(),
    },
    atomeryApps: {
      text: 'Atomery Apps',
      Icon: StorefrontIcon,
      ref: useRef(),
    },
    miscs: {
      text: 'Miscellaneous',
      Icon: MoreHorizIcon,
      ref: useRef(),
    },
  };

  useEffect(() => {
    const scrollTo = window.remote.getGlobal('preferencesScrollTo');
    if (!scrollTo) return;
    sections[scrollTo].ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const debouncedRequestShowRequireRestartDialog = useCallback(
    debounce(() => requestShowRequireRestartDialog(), 2500),
    [],
  );

  return (
    <div className={classes.root}>
      <div className={classes.sidebar}>
        <List dense>
          {Object.keys(sections).map((sectionKey, i) => {
            const { Icon, text, ref, hidden } = sections[sectionKey];
            if (hidden) return;
            return (
              <React.Fragment key={sectionKey}>
                {i > 0 && <Divider />}
                <ListItem button onClick={() => ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  <ListItemIcon>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </div>

      <div className={classes.inner}>
        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.wiki.ref}>
          TiddlyWiki
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem>
              <TextField
                helperText={t('Preference.UserNameDetail')}
                fullWidth
                onChange={event => {
                  requestSetPreference('userName', event.target.value);
                }}
                label={t('Preference.UserName')}
                value={userName}
              />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.sync.ref}>
          {t('Preference.Sync')}
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem>
              <ListItemText
                primary={t('Preference.SyncInterval')}
                secondary={t('Preference.SyncIntervalDescription')}
              />
              <div className={classes.timePickerContainer}>
                <TimePicker
                  autoOk={false}
                  ampm={false}
                  openTo="hours"
                  views={['hours', 'minutes', 'seconds']}
                  inputFormat="HH:mm:ss"
                  renderInput={timeProps => <TextField {...timeProps} />}
                  value={fromUnixTime(syncDebounceInterval / 1000 + new Date().getTimezoneOffset() * 60)}
                  onChange={date => {
                    const timeWithoutDate = setDate(setMonth(setYear(date, 1970), 0), 1);
                    const utcTime = (timeWithoutDate.getTime() / 1000 - new Date().getTimezoneOffset() * 60) * 1000;
                    requestSetPreference('syncDebounceInterval', utcTime);
                    debouncedRequestShowRequireRestartDialog();
                  }}
                  onClose={() => {
                    window.preventClosingWindow = false;
                  }}
                  onOpen={() => {
                    window.preventClosingWindow = true;
                  }}
                />
              </div>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.general.ref}>
          {t('Preference.General')}
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <StatedMenu
              id="theme"
              buttonElement={
                <ListItem button>
                  <ListItemText primary={t('Preference.Theme')} secondary={getThemeString(themeSource)} />
                  <ChevronRightIcon color="action" />
                </ListItem>
              }
            >
              <MenuItem dense onClick={() => requestSetPreference('themeSource', 'system')}>
                {t('Preference.SystemDefalutTheme')}
              </MenuItem>
              <MenuItem dense onClick={() => requestSetPreference('themeSource', 'light')}>
                {t('Preference.LightTheme')}
              </MenuItem>
              <MenuItem dense onClick={() => requestSetPreference('themeSource', 'dark')}>
                {t('Preference.DarkTheme')}
              </MenuItem>
            </StatedMenu>
            <Divider />
            <ListItem>
              <ListItemText primary={t('Preference.ShowSideBar')} secondary={t('Preference.ShowSideBarDetail')} />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={sidebar}
                  onChange={event => {
                    requestSetPreference('sidebar', event.target.checked);
                    requestRealignActiveWorkspace();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary={t('Preference.ShowSideBarShortcut')} />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={sidebarShortcutHints}
                  onChange={event => {
                    requestSetPreference('sidebarShortcutHints', event.target.checked);
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary={t('Preference.ShowNavigationBar')}
                secondary={t('Preference.ShowNavigationBarDetail')}
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  // must show sidebar or navigation bar on Linux
                  // if not, as user can't right-click on menu bar icon
                  // they can't access preferences or notifications
                  checked={(window.remote.getPlatform() === 'linux' && attachToMenubar && !sidebar) || navigationBar}
                  disabled={window.remote.getPlatform() === 'linux' && attachToMenubar && !sidebar}
                  onChange={event => {
                    requestSetPreference('navigationBar', event.target.checked);
                    requestRealignActiveWorkspace();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            {window.remote.getPlatform() === 'darwin' && (
              <>
                <Divider />
                <ListItem>
                  <ListItemText primary={t('Preference.ShowTitleBar')} secondary={t('Preference.ShowTitleBarDetail')} />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      color="primary"
                      checked={titleBar}
                      onChange={event => {
                        requestSetPreference('titleBar', event.target.checked);
                        requestRealignActiveWorkspace();
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </>
            )}
            {window.remote.getPlatform() !== 'darwin' && (
              <>
                <Divider />
                <ListItem>
                  <ListItemText primary={t('Preference.HideMenuBar')} secondary={t('Preference.HideMenuBarDetail')} />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      color="primary"
                      checked={hideMenuBar}
                      onChange={event => {
                        requestSetPreference('hideMenuBar', event.target.checked);
                        requestShowRequireRestartDialog();
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </>
            )}
            <Divider />
            <ListItem>
              <ListItemText
                primary={
                  window.remote.getPlatform() === 'win32'
                    ? t('Preference.AttachToTaskbar')
                    : t('Preference.AttachToMenuBar')
                }
                secondary={window.remote.getPlatform() !== 'linux' ? t('Preference.AttachToMenuBarTip') : undefined}
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={attachToMenubar}
                  onChange={event => {
                    requestSetPreference('attachToMenubar', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.extensions.ref}>
          Extensions
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List disablePadding dense>
            <ListItem>
              <ListItemText
                primary="Block ads &amp; trackers"
                secondary={
                  <>
                    <span>Powered by </span>
                    <span
                      role="link"
                      tabIndex={0}
                      className={classes.link}
                      onClick={() => requestOpen('https://cliqz.com/en/whycliqz/adblocking')}
                      onKeyDown={event => {
                        if (event.key !== 'Enter') return;
                        requestOpen('https://cliqz.com/en/whycliqz/adblocking');
                      }}
                    >
                      Cliqz
                    </span>
                    <span>.</span>
                  </>
                }
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={blockAds}
                  onChange={event => {
                    requestSetPreference('blockAds', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Create dark themes for web apps on the fly"
                secondary={
                  <>
                    <span>Powered by </span>
                    <span
                      role="link"
                      tabIndex={0}
                      className={classes.link}
                      onClick={() => requestOpen('https://darkreader.org/')}
                      onKeyDown={event => {
                        if (event.key !== 'Enter') return;
                        requestOpen('https://darkreader.org/');
                      }}
                    >
                      Dark Reader
                    </span>
                    <span>.</span>
                    <span> Invert bright colors making them high contrast </span>
                    <span>and easy to read at night.</span>
                  </>
                }
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={themeSource !== 'light' && darkReader}
                  disabled={themeSource === 'light'}
                  onChange={event => {
                    requestSetPreference('darkReader', event.target.checked);
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText className={classes.sliderContainer}>
                <Grid container spacing={2}>
                  <Grid classes={{ item: classes.sliderTitleContainer }} item>
                    <Typography id="brightness-slider" variant="body2" gutterBottom={false}>
                      Brightness
                    </Typography>
                  </Grid>
                  <Grid item xs>
                    <Slider
                      classes={{ markLabel: classes.sliderMarkLabel }}
                      value={darkReaderBrightness - 100}
                      disabled={themeSource === 'light' || !darkReader}
                      aria-labelledby="brightness-slider"
                      valueLabelDisplay="auto"
                      step={5}
                      valueLabelFormat={value => {
                        if (value > 0) return `+${value}`;
                        return value;
                      }}
                      marks={[
                        {
                          value: darkReaderBrightness - 100,
                          label: `${darkReaderBrightness > 100 ? '+' : ''}${darkReaderBrightness - 100}`,
                        },
                      ]}
                      min={-50}
                      max={50}
                      onChange={(_, value) => {
                        requestSetPreference('darkReaderBrightness', value + 100);
                      }}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid classes={{ item: classes.sliderTitleContainer }} item>
                    <Typography id="contrast-slider" variant="body2" gutterBottom={false}>
                      Contrast
                    </Typography>
                  </Grid>
                  <Grid item xs>
                    <Slider
                      classes={{ markLabel: classes.sliderMarkLabel }}
                      value={darkReaderContrast - 100}
                      disabled={themeSource === 'light' || !darkReader}
                      aria-labelledby="contrast-slider"
                      valueLabelDisplay="auto"
                      step={5}
                      valueLabelFormat={value => {
                        if (value > 0) return `+${value}`;
                        return value;
                      }}
                      marks={[
                        {
                          value: darkReaderContrast - 100,
                          label: `${darkReaderContrast > 100 ? '+' : ''}${darkReaderContrast - 100}`,
                        },
                      ]}
                      min={-50}
                      max={50}
                      onChange={(_, value) => {
                        requestSetPreference('darkReaderContrast', value + 100);
                      }}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid classes={{ item: classes.sliderTitleContainer }} item>
                    <Typography id="sepia-slider" variant="body2" gutterBottom={false}>
                      Sepia
                    </Typography>
                  </Grid>
                  <Grid item xs>
                    <Slider
                      classes={{ markLabel: classes.sliderMarkLabel }}
                      value={darkReaderSepia}
                      disabled={themeSource === 'light' || !darkReader}
                      aria-labelledby="sepia-slider"
                      valueLabelDisplay="auto"
                      step={5}
                      marks={[
                        {
                          value: darkReaderSepia,
                          label: `${darkReaderSepia}`,
                        },
                      ]}
                      min={0}
                      max={100}
                      onChange={(_, value) => {
                        requestSetPreference('darkReaderSepia', value);
                      }}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid classes={{ item: classes.sliderTitleContainer }} item>
                    <Typography id="grayscale-slider" variant="body2" gutterBottom={false}>
                      Grayscale
                    </Typography>
                  </Grid>
                  <Grid item xs>
                    <Slider
                      classes={{ markLabel: classes.sliderMarkLabel }}
                      value={darkReaderGrayscale}
                      disabled={themeSource === 'light' || !darkReader}
                      aria-labelledby="grayscale-slider"
                      valueLabelDisplay="auto"
                      step={5}
                      marks={[
                        {
                          value: darkReaderGrayscale,
                          label: `${darkReaderGrayscale}`,
                        },
                      ]}
                      min={0}
                      max={100}
                      onChange={(_, value) => {
                        requestSetPreference('darkReaderGrayscale', value);
                      }}
                    />
                  </Grid>
                </Grid>
              </ListItemText>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.notifications.ref}>
          Notifications
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem button onClick={requestShowNotificationsWindow}>
              <ListItemText primary="Control notifications" />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText>
                Automatically disable notifications by schedule:
                <div className={classes.timePickerContainer}>
                  <TimePicker
                    autoOk={false}
                    label="from"
                    renderInput={timeProps => <TextField {...timeProps} />}
                    value={new Date(pauseNotificationsByScheduleFrom)}
                    onChange={d => requestSetPreference('pauseNotificationsByScheduleFrom', d.toString())}
                    onClose={() => {
                      window.preventClosingWindow = false;
                    }}
                    onOpen={() => {
                      window.preventClosingWindow = true;
                    }}
                    disabled={!pauseNotificationsBySchedule}
                  />
                  <TimePicker
                    autoOk={false}
                    label="to"
                    renderInput={timeProps => <TextField {...timeProps} />}
                    value={new Date(pauseNotificationsByScheduleTo)}
                    onChange={d => requestSetPreference('pauseNotificationsByScheduleTo', d.toString())}
                    onClose={() => {
                      window.preventClosingWindow = false;
                    }}
                    onOpen={() => {
                      window.preventClosingWindow = true;
                    }}
                    disabled={!pauseNotificationsBySchedule}
                  />
                </div>
                ({window.Intl.DateTimeFormat().resolvedOptions().timeZone})
              </ListItemText>
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={pauseNotificationsBySchedule}
                  onChange={event => {
                    requestSetPreference('pauseNotificationsBySchedule', event.target.checked);
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary="Mute audio when notifications are paused" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={pauseNotificationsMuteAudio}
                  onChange={event => {
                    requestSetPreference('pauseNotificationsMuteAudio', event.target.checked);
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary="Show unread count badge" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={unreadCountBadge}
                  onChange={event => {
                    requestSetPreference('unreadCountBadge', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem
              button
              onClick={() => {
                requestShowNotification({
                  title: 'Test notifications',
                  body: 'It is working!',
                });
              }}
            >
              <ListItemText
                primary="Test notifications"
                secondary={(() => {
                  // only show this message on macOS Catalina 10.15 & above
                  if (window.remote.getPlatform() === 'darwin' && semver.gte(window.remote.getOSVersion(), '10.15.0')) {
                    return (
                      <>
                        <span>If notifications don&apos;t show up,</span>
                        <span> make sure you enable notifications in </span>
                        <b>
                          <span>macOS Preferences &gt; Notifications &gt; TiddlyGit</span>
                        </b>
                        <span>.</span>
                      </>
                    );
                  }
                })()}
              />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                secondary={
                  <>
                    <span>TiddlyGit supports notifications out of the box. </span>
                    <span>But for some web apps, to receive notifications, </span>
                    <span>you will need to manually configure additional </span>
                    <span>web app settings. </span>
                    <span
                      role="link"
                      tabIndex={0}
                      className={classes.link}
                      onClick={() =>
                        requestOpen(
                          'https://github.com/atomery/webcatalog/wiki/How-to-Enable-Notifications-in-Web-Apps',
                        )
                      }
                      onKeyDown={event => {
                        if (event.key !== 'Enter') return;
                        requestOpen(
                          'https://github.com/atomery/webcatalog/wiki/How-to-Enable-Notifications-in-Web-Apps',
                        );
                      }}
                    >
                      Learn more
                    </span>
                    <span>.</span>
                  </>
                }
              />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.languages.ref}>
          Languages
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem>
              <ListItemText primary="Spell check" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={spellcheck}
                  onChange={event => {
                    requestSetPreference('spellcheck', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            {window.remote.getPlatform() !== 'darwin' && (
              <>
                <Divider />
                <ListItem button onClick={requestShowSpellcheckLanguagesWindow}>
                  <ListItemText
                    primary="Preferred spell checking languages"
                    secondary={spellcheckLanguages.map(code => hunspellLanguagesMap[code]).join(' | ')}
                  />
                  <ChevronRightIcon color="action" />
                </ListItem>
              </>
            )}
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.downloads.ref}>
          Downloads
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem
              button
              onClick={() => {
                window.remote.dialog
                  .showOpenDialog({
                    properties: ['openDirectory'],
                  })
                  .then(result => {
                    // eslint-disable-next-line promise/always-return
                    if (!result.canceled && result.filePaths) {
                      requestSetPreference('downloadPath', result.filePaths[0]);
                    }
                  })
                  .catch(error => {
                    console.log(error); // eslint-disable-line no-console
                  });
              }}
            >
              <ListItemText primary="Download Location" secondary={downloadPath} />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary="Ask where to save each file before downloading" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={askForDownloadPath}
                  onChange={event => {
                    requestSetPreference('askForDownloadPath', event.target.checked);
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" color="textPrimary" className={classes.sectionTitle} ref={sections.network.ref}>
          Network
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List disablePadding dense>
            <ListItem button onClick={requestShowProxyWindow}>
              <ListItemText primary="Configure proxy settings (BETA)" />
              <ChevronRightIcon color="action" />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.privacy.ref}>
          Privacy &amp; Security
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem>
              <ListItemText primary="Block ads &amp; trackers" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={blockAds}
                  onChange={event => {
                    requestSetPreference('blockAds', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary="Remember last page visited" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={rememberLastPageVisited}
                  onChange={event => {
                    requestSetPreference('rememberLastPageVisited', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary="Share browsing data between workspaces" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={shareWorkspaceBrowsingData}
                  onChange={event => {
                    requestSetPreference('shareWorkspaceBrowsingData', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Ignore certificate errors"
                secondary={
                  <>
                    <span>Not recommended. </span>
                    <span
                      role="link"
                      tabIndex={0}
                      className={classes.link}
                      onClick={() =>
                        requestOpen(
                          'https://groups.google.com/a/chromium.org/d/msg/security-dev/mB2KJv_mMzM/ddMteO9RjXEJ',
                        )
                      }
                      onKeyDown={event => {
                        if (event.key !== 'Enter') return;
                        requestOpen(
                          'https://groups.google.com/a/chromium.org/d/msg/security-dev/mB2KJv_mMzM/ddMteO9RjXEJ',
                        );
                      }}
                    >
                      Learn more
                    </span>
                    .
                  </>
                }
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={ignoreCertificateErrors}
                  onChange={event => {
                    requestSetPreference('ignoreCertificateErrors', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem button onClick={requestClearBrowsingData}>
              <ListItemText primary="Clear browsing data" secondary="Clear cookies, cache, and more" />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem
              button
              onClick={() =>
                requestOpen('https://github.com/tiddly-gittly/TiddlyGit-Desktop/blob/master/PrivacyPolicy.md')
              }
            >
              <ListItemText primary="Privacy Policy" />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.system.ref}>
          System
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItemDefaultBrowser />
            <Divider />
            <ListItemDefaultMailClient />
            <Divider />
            <StatedMenu
              id="openAtLogin"
              buttonElement={
                <ListItem button>
                  <ListItemText primary="Open at login" secondary={getOpenAtLoginString(openAtLogin)} />
                  <ChevronRightIcon color="action" />
                </ListItem>
              }
            >
              <MenuItem dense onClick={() => requestSetSystemPreference('openAtLogin', 'yes')}>
                Yes
              </MenuItem>
              <MenuItem dense onClick={() => requestSetSystemPreference('openAtLogin', 'yes-hidden')}>
                Yes, but minimized
              </MenuItem>
              <MenuItem dense onClick={() => requestSetSystemPreference('openAtLogin', 'no')}>
                No
              </MenuItem>
            </StatedMenu>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.developers.ref}>
          Developers
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem button onClick={requestShowCustomUserAgentWindow}>
              <ListItemText
                primary="Custom User Agent"
                secondary={customUserAgent || 'Not set'}
                classes={{ secondary: classes.secondaryEllipsis }}
              />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => requestShowCodeInjectionWindow('js')}>
              <ListItemText
                primary="JS Code Injection"
                secondary={
                  jsCodeInjection
                    ? `Set ${allowNodeInJsCodeInjection ? ' (with access to Node.JS & Electron APIs)' : ''}`
                    : 'Not set'
                }
              />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => requestShowCodeInjectionWindow('css')}>
              <ListItemText primary="CSS Code Injection" secondary={cssCodeInjection ? 'Set' : 'Not set'} />
              <ChevronRightIcon color="action" />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.advanced.ref}>
          Advanced
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem button onClick={() => requestOpen(getLogFolderPath(), true)}>
              <ListItemText primary={t('Preference.OpenLogFolder')} secondary={t('Preference.OpenLogFolderDetail')} />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Hibernate unused workspaces at app launch"
                secondary="Hibernate all workspaces at launch, except the last active workspace."
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={hibernateUnusedWorkspacesAtLaunch}
                  onChange={event => {
                    requestSetPreference('hibernateUnusedWorkspacesAtLaunch', event.target.checked);
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            {window.remote.getPlatform() === 'darwin' && (
              <>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Swipe with three fingers to navigate"
                    secondary={
                      <>
                        <span>Navigate between pages with 3-finger gestures. </span>
                        <span>Swipe left to go back or swipe right to go forward.</span>
                        <br />
                        <span>To enable it, you also need to change </span>
                        <b>macOS Preferences &gt; Trackpad &gt; More Gestures &gt; Swipe between page</b>
                        <span> to </span>
                        <b>Swipe with three fingers</b>
                        <span> or </span>
                        <b>Swipe with two or three fingers.</b>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      color="primary"
                      checked={swipeToNavigate}
                      onChange={event => {
                        requestSetPreference('swipeToNavigate', event.target.checked);
                        requestShowRequireRestartDialog();
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </>
            )}
            <Divider />
            <ListItem>
              <ListItemText primary="Use hardware acceleration when available" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={useHardwareAcceleration}
                  onChange={event => {
                    requestSetPreference('useHardwareAcceleration', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.updates.ref}>
          Updates
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem
              button
              onClick={() => requestCheckForUpdates(false)}
              disabled={
                updaterStatus === 'checking-for-update' ||
                updaterStatus === 'download-progress' ||
                updaterStatus === 'download-progress' ||
                updaterStatus === 'update-available'
              }
            >
              <ListItemText
                primary={updaterStatus === 'update-downloaded' ? 'Restart to Apply Updates' : 'Check for Updates'}
                secondary={getUpdaterDesc(updaterStatus, updaterInfo)}
              />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary="Receive pre-release updates" />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  color="primary"
                  checked={allowPrerelease}
                  onChange={event => {
                    requestSetPreference('allowPrerelease', event.target.checked);
                    requestShowRequireRestartDialog();
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.reset.ref}>
          Reset
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem button onClick={requestResetPreferences}>
              <ListItemText primary="Restore preferences to their original defaults" />
              <ChevronRightIcon color="action" />
            </ListItem>
          </List>
        </Paper>

        <Typography
          variant="subtitle2"
          color="textPrimary"
          className={classes.sectionTitle}
          ref={sections.atomeryApps.ref}
        >
          Atomery Apps
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List disablePadding dense>
            <ListItem button onClick={() => requestOpen('https://webcatalogapp.com?utm_source=singlebox_app')}>
              <ListItemText
                primary={<img src={webcatalogLogo} alt="WebCatalog" className={classes.logo} />}
                secondary="Run Web Apps like Real Apps"
              />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => requestOpen('https://singleboxapp.com?utm_source=singlebox_app')}>
              <ListItemText
                primary={<img src={singleboxLogo} alt="Singlebox" className={classes.logo} />}
                secondary="All Your Apps in One Single Window"
              />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => requestOpen('https://translatiumapp.com?utm_source=singlebox_app')}>
              <ListItemText
                primary={<img src={translatiumLogo} alt="Translatium" className={classes.logo} />}
                secondary="Translate Any Languages like a Pro"
              />
              <ChevronRightIcon color="action" />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="subtitle2" className={classes.sectionTitle} ref={sections.miscs.ref}>
          Miscellaneous
        </Typography>
        <Paper elevation={0} className={classes.paper}>
          <List dense disablePadding>
            <ListItem button onClick={requestShowAboutWindow}>
              <ListItemText primary="About" />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => requestOpen('https://github.com/tiddly-gittly/tiddlygit-desktop/')}>
              <ListItemText primary="Website" />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => requestOpen('https://github.com/tiddly-gittly/tiddlygit-desktop/issues')}>
              <ListItemText primary="Support" />
              <ChevronRightIcon color="action" />
            </ListItem>
            <Divider />
            <ListItem button onClick={requestQuit}>
              <ListItemText primary="Quit" />
              <ChevronRightIcon color="action" />
            </ListItem>
          </List>
        </Paper>
      </div>
    </div>
  );
};

Preferences.propTypes = {
  allowNodeInJsCodeInjection: PropTypes.bool.isRequired,
  allowPrerelease: PropTypes.bool.isRequired,
  askForDownloadPath: PropTypes.bool.isRequired,
  attachToMenubar: PropTypes.bool.isRequired,
  blockAds: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired,
  cssCodeInjection: PropTypes.string,
  customUserAgent: PropTypes.string,
  darkReader: PropTypes.bool.isRequired,
  darkReaderBrightness: PropTypes.number.isRequired,
  darkReaderContrast: PropTypes.number.isRequired,
  darkReaderGrayscale: PropTypes.number.isRequired,
  darkReaderSepia: PropTypes.number.isRequired,
  downloadPath: PropTypes.string.isRequired,
  hibernateUnusedWorkspacesAtLaunch: PropTypes.bool.isRequired,
  hideMenuBar: PropTypes.bool.isRequired,
  ignoreCertificateErrors: PropTypes.bool.isRequired,
  jsCodeInjection: PropTypes.string,
  navigationBar: PropTypes.bool.isRequired,
  openAtLogin: PropTypes.oneOf(['yes', 'yes-hidden', 'no']).isRequired,
  pauseNotificationsBySchedule: PropTypes.bool.isRequired,
  pauseNotificationsByScheduleFrom: PropTypes.string.isRequired,
  pauseNotificationsByScheduleTo: PropTypes.string.isRequired,
  pauseNotificationsMuteAudio: PropTypes.bool.isRequired,
  rememberLastPageVisited: PropTypes.bool.isRequired,
  shareWorkspaceBrowsingData: PropTypes.bool.isRequired,
  sidebar: PropTypes.bool.isRequired,
  sidebarShortcutHints: PropTypes.bool.isRequired,
  spellcheck: PropTypes.bool.isRequired,
  spellcheckLanguages: PropTypes.arrayOf(PropTypes.string).isRequired,
  swipeToNavigate: PropTypes.bool.isRequired,
  syncDebounceInterval: PropTypes.number.isRequired,
  themeSource: PropTypes.string.isRequired,
  titleBar: PropTypes.bool.isRequired,
  unreadCountBadge: PropTypes.bool.isRequired,
  updaterInfo: PropTypes.object,
  updaterStatus: PropTypes.string,
  userName: PropTypes.string,
  useHardwareAcceleration: PropTypes.bool.isRequired,
};

const mapStateToProps = state => ({
  allowNodeInJsCodeInjection: state.preferences.allowNodeInJsCodeInjection,
  allowPrerelease: state.preferences.allowPrerelease,
  askForDownloadPath: state.preferences.askForDownloadPath,
  attachToMenubar: state.preferences.attachToMenubar,
  blockAds: state.preferences.blockAds,
  cssCodeInjection: state.preferences.cssCodeInjection,
  customUserAgent: state.preferences.customUserAgent,
  darkReader: state.preferences.darkReader,
  darkReaderBrightness: state.preferences.darkReaderBrightness,
  darkReaderContrast: state.preferences.darkReaderContrast,
  darkReaderGrayscale: state.preferences.darkReaderGrayscale,
  darkReaderSepia: state.preferences.darkReaderSepia,
  downloadPath: state.preferences.downloadPath,
  hibernateUnusedWorkspacesAtLaunch: state.preferences.hibernateUnusedWorkspacesAtLaunch,
  hideMenuBar: state.preferences.hideMenuBar,
  ignoreCertificateErrors: state.preferences.ignoreCertificateErrors,
  isDefaultMailClient: state.general.isDefaultMailClient,
  isDefaultWebBrowser: state.general.isDefaultWebBrowser,
  jsCodeInjection: state.preferences.jsCodeInjection,
  navigationBar: state.preferences.navigationBar,
  openAtLogin: state.systemPreferences.openAtLogin,
  pauseNotificationsBySchedule: state.preferences.pauseNotificationsBySchedule,
  pauseNotificationsByScheduleFrom: state.preferences.pauseNotificationsByScheduleFrom,
  pauseNotificationsByScheduleTo: state.preferences.pauseNotificationsByScheduleTo,
  pauseNotificationsMuteAudio: state.preferences.pauseNotificationsMuteAudio,
  rememberLastPageVisited: state.preferences.rememberLastPageVisited,
  shareWorkspaceBrowsingData: state.preferences.shareWorkspaceBrowsingData,
  sidebar: state.preferences.sidebar,
  sidebarShortcutHints: state.preferences.sidebarShortcutHints,
  spellcheck: state.preferences.spellcheck,
  spellcheckLanguages: state.preferences.spellcheckLanguages,
  swipeToNavigate: state.preferences.swipeToNavigate,
  syncDebounceInterval: state.preferences.syncDebounceInterval,
  themeSource: state.preferences.themeSource,
  titleBar: state.preferences.titleBar,
  unreadCountBadge: state.preferences.unreadCountBadge,
  updaterInfo: state.updater.info,
  updaterStatus: state.updater.status,
  useHardwareAcceleration: state.preferences.useHardwareAcceleration,
  userName: state.preferences.userName,
});

export default connectComponent(Preferences, mapStateToProps, undefined, styles);
