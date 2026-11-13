import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { figmaColors } from '../theme/figmaTheme';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CheckIcon({
  size = 11,
  color = '#172115',
  strokeWidth = 1.15,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 11 11" fill="none">
      <Path
        d="M2.29167 5.5L4.125 7.33333L8.70833 2.75"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <View
      style={[
        styles.verifiedBadge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <CheckIcon size={size * 0.68} color="#172115" strokeWidth={1.35} />
    </View>
  );
}

export function UsersIcon({
  size = 13,
  color = '#5D675A',
  strokeWidth = 1.05,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Path
        d="M8.66667 11.375V10.2917C8.66667 9.71703 8.43839 9.16593 8.03207 8.7596C7.62574 8.35327 7.07464 8.125 6.5 8.125H3.25C2.67536 8.125 2.12426 8.35327 1.71794 8.7596C1.31161 9.16593 1.08333 9.71703 1.08333 10.2917V11.375"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.04167 3.79167C7.04167 4.98828 6.07162 5.95833 4.875 5.95833C3.67838 5.95833 2.70833 4.98828 2.70833 3.79167C2.70833 2.59505 3.67838 1.625 4.875 1.625C6.07162 1.625 7.04167 2.59505 7.04167 3.79167Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.9167 11.375V10.2917C11.9163 9.8116 11.7565 9.34525 11.4624 8.96584C11.1683 8.58642 10.7565 8.31543 10.2917 8.19542M8.66667 1.69542C9.13273 1.81475 9.54581 2.0858 9.8408 2.46583C10.1358 2.84587 10.2959 3.31328 10.2959 3.79438C10.2959 4.27547 10.1358 4.74288 9.8408 5.12291C9.54581 5.50295 9.13273 5.774 8.66667 5.89333"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PinIcon({
  size = 13,
  color = '#5D675A',
  strokeWidth = 1.05,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Path
        d="M10.8333 5.41667C10.8333 8.125 6.5 11.375 6.5 11.375C6.5 11.375 2.16667 8.125 2.16667 5.41667C2.16667 4.2674 2.62321 3.16519 3.43587 2.35254C4.24853 1.53988 5.35073 1.08333 6.5 1.08333C7.64927 1.08333 8.75147 1.53988 9.56413 2.35254C10.3768 3.16519 10.8333 4.2674 10.8333 5.41667Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.85417 5.41667C7.85417 6.16455 7.24789 6.77083 6.5 6.77083C5.75211 6.77083 5.14583 6.16455 5.14583 5.41667C5.14583 4.66878 5.75211 4.0625 6.5 4.0625C7.24789 4.0625 7.85417 4.66878 7.85417 5.41667Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChatBubbleIcon({
  size = 14,
  color = '#FFFFFF',
  strokeWidth = 1.15,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path
        d="M12.25 8.75C12.25 9.36884 12.0042 9.96233 11.5666 10.3999C11.129 10.8375 10.5355 11.0833 9.91667 11.0833H4.66667L1.75 12.8333V4.08333C1.75 3.4645 1.99583 2.871 2.43342 2.43342C2.871 1.99583 3.4645 1.75 4.08333 1.75H9.91667C10.5355 1.75 11.129 1.99583 11.5666 2.43342C12.0042 2.871 12.25 3.4645 12.25 4.08333V8.75Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LockIcon({
  size = 13,
  color = '#687460',
  strokeWidth = 1.05,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Path
        d="M3.79167 5.41667H9.20833C10.1058 5.41667 10.8333 6.1442 10.8333 7.04167V9.75C10.8333 10.6475 10.1058 11.375 9.20833 11.375H3.79167C2.8942 11.375 2.16667 10.6475 2.16667 9.75V7.04167C2.16667 6.1442 2.8942 5.41667 3.79167 5.41667Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.33333 5.41667V3.79167C4.33333 3.21703 4.56161 2.66593 4.96793 2.2596C5.37426 1.85327 5.92536 1.625 6.5 1.625C7.07464 1.625 7.62574 1.85327 8.03206 2.2596C8.43839 2.66593 8.66667 3.21703 8.66667 3.79167V5.41667"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HomeIcon({
  size = 21,
  color = figmaColors.ink,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Path
        d="M2.625 9.625L10.5 2.625L18.375 9.625"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.375 8.75V18.375H7.875M7.875 18.375H13.125M7.875 18.375V12.25H13.125V18.375M13.125 18.375H16.625V8.75"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CompassIcon({
  size = 21,
  color = figmaColors.inkInactive,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Path
        d="M18.375 10.5C18.375 14.8492 14.8492 18.375 10.5 18.375C6.15076 18.375 2.625 14.8492 2.625 10.5C2.625 6.15076 6.15076 2.625 10.5 2.625C14.8492 2.625 18.375 6.15076 18.375 10.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.5625 7.4375L11.8125 11.8125L7.4375 13.5625L9.1875 9.1875L13.5625 7.4375Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusIcon({
  size = 22,
  color = figmaColors.brandLime,
  strokeWidth = 1.75,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M11.5 4.79167V11.5M11.5 11.5V18.2083M11.5 11.5H4.79167M11.5 11.5H18.2083"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({
  size = 21,
  color = figmaColors.inkInactive,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Path
        d="M15.75 7C15.75 5.60761 15.1969 4.27226 14.2123 3.28769C13.2277 2.30312 11.8924 1.75 10.5 1.75C9.10761 1.75 7.77226 2.30312 6.78769 3.28769C5.80312 4.27226 5.25 5.60761 5.25 7C5.25 13.125 2.625 13.125 2.625 14.875H18.375C18.375 13.125 15.75 13.125 15.75 7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.75 18.375H12.25"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserIcon({
  size = 21,
  color = figmaColors.inkInactive,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Path
        d="M14 7C14 8.933 12.433 10.5 10.5 10.5C8.567 10.5 7 8.933 7 7C7 5.067 8.567 3.5 10.5 3.5C12.433 3.5 14 5.067 14 7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 18.375C3.5 16.5185 4.2375 14.738 5.55025 13.4253C6.86301 12.1125 8.64348 11.375 10.5 11.375C12.3565 11.375 14.137 12.1125 15.4497 13.4253C16.7625 14.738 17.5 16.5185 17.5 18.375"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({
  size = 18,
  color = '#637062',
  strokeWidth = 1.45,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19" fill="none">
      <Path
        d="M14.25 8.70833C14.25 11.7689 11.7689 14.25 8.70833 14.25C5.64776 14.25 3.16667 11.7689 3.16667 8.70833C3.16667 5.64776 5.64776 3.16667 8.70833 3.16667C11.7689 3.16667 14.25 5.64776 14.25 8.70833Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.8333 15.8333L12.6667 12.6667"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({
  size = 20,
  color = figmaColors.ink,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12.5 15L7.5 10L12.5 5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({
  size = 18,
  color = figmaColors.inkMuted,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7.5 15L12.5 10L7.5 5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function InfoIcon({
  size = 20,
  color = figmaColors.ink,
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C14.1421 2.5 17.5 5.85786 17.5 10Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 9.16667V13.3333M10 6.66667H10.0083"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalendarIcon({
  size = 18,
  color = '#26331C',
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 4.16667H15C16.3807 4.16667 17.5 5.28596 17.5 6.66667V15C17.5 16.3807 16.3807 17.5 15 17.5H5C3.61929 17.5 2.5 16.3807 2.5 15V6.66667C2.5 5.28596 3.61929 4.16667 5 4.16667Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.3333 2.5V5.83333M6.66667 2.5V5.83333M2.5 8.33333H17.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ReplyIcon({
  size = 12,
  color = '#727B6F',
  strokeWidth = 1.05,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M4.5 8.5L2 6L4.5 3.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 6H7C7.79565 6 8.55871 6.31607 9.12132 6.87868C9.68393 7.44129 10 8.20435 10 9V9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CameraIcon({
  size = 17,
  color = '#7A8278',
  strokeWidth = 1.35,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 17 17" fill="none">
      <Path
        d="M10.2708 3.54167L9.20833 2.125H7.79167L6.72917 3.54167H3.54167C3.16594 3.54167 2.80561 3.69092 2.53993 3.9566C2.27426 4.22228 2.125 4.58261 2.125 4.95833V12.75C2.125 13.1257 2.27426 13.4861 2.53993 13.7517C2.80561 14.0174 3.16594 14.1667 3.54167 14.1667H13.4583C13.8341 14.1667 14.1944 14.0174 14.4601 13.7517C14.7257 13.4861 14.875 13.1257 14.875 12.75V4.95833C14.875 4.58261 14.7257 4.22228 14.4601 3.9566C14.1944 3.69092 13.8341 3.54167 13.4583 3.54167H10.2708Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.3333 9.20833C11.3333 10.7731 10.0648 12.0417 8.5 12.0417C6.93519 12.0417 5.66667 10.7731 5.66667 9.20833C5.66667 7.64353 6.93519 6.375 8.5 6.375C10.0648 6.375 11.3333 7.64353 11.3333 9.20833Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SendIcon({
  size = 17,
  color = figmaColors.brandLime,
  strokeWidth = 1.4,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M16.5 1.5L11.25 16.5L8.25 9.75L1.5 6.75L16.5 1.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16.5 1.5L8.25 9.75"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MoreHorizontalIcon({
  size = 20,
  color = figmaColors.ink,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="4.16667" cy="10" r="1.25" fill={color} />
      <Circle cx="10" cy="10" r="1.25" fill={color} />
      <Circle cx="15.8333" cy="10" r="1.25" fill={color} />
    </Svg>
  );
}

export function CloseIcon({
  size = 18,
  color = figmaColors.ink,
  strokeWidth = 1.75,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M15 5L5 15M5 5L15 15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LogOutIcon({
  size = 18,
  color = figmaColors.danger,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.3333 14.1667L17.5 10L13.3333 5.83333M17.5 10H7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  verifiedBadge: {
    backgroundColor: figmaColors.brandLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
