"use client";
import StaffChatView from "../staffchat/StaffChatView";
import type { ScreenProps } from "@/types/screens";
export default function StaffChatScreen(props: ScreenProps) { return <StaffChatView role={props.role} />; }
