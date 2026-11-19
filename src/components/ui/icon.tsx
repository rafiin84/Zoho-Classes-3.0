"use client";
import * as P from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";

// Explicit map keeps bundles predictable and lets config files reference icons by string.
const map: Record<string, React.ComponentType<IconProps>> = {
  House: P.House, Path: P.Path, Newspaper: P.Newspaper, GameController: P.GameController, UserCircle: P.UserCircle, Sparkle: P.Sparkle, Compass: P.Compass,
  NotePencil: P.NotePencil, Exam: P.Exam, TreeStructure: P.TreeStructure, BookOpenText: P.BookOpenText, Lightning: P.Lightning, ChatCircleDots: P.ChatCircleDots,
  VideoCamera: P.VideoCamera, CalendarBlank: P.CalendarBlank, CheckSquare: P.CheckSquare, Certificate: P.Certificate, Receipt: P.Receipt, Trophy: P.Trophy,
  UsersThree: P.UsersThree, PaintBrush: P.PaintBrush, SealCheck: P.SealCheck, Bell: P.Bell, SquaresFour: P.SquaresFour, Chalkboard: P.Chalkboard,
  BookBookmark: P.BookBookmark, ClipboardText: P.ClipboardText, Robot: P.Robot, ChartBar: P.ChartBar, Database: P.Database, FileText: P.FileText,
  CheckCircle: P.CheckCircle, Gauge: P.Gauge, ChatsCircle: P.ChatsCircle, Envelope: P.Envelope, ShieldCheck: P.ShieldCheck, GraduationCap: P.GraduationCap,
  BuildingOffice: P.BuildingOffice, Storefront: P.Storefront, Megaphone: P.Megaphone, ChartLineUp: P.ChartLineUp, PlugsConnected: P.PlugsConnected,
  Target: P.Target, MagicWand: P.MagicWand, Key: P.Key, MapTrifold: P.MapTrifold, FlagBanner: P.FlagBanner, ShareNetwork: P.ShareNetwork, ChartLineDown: P.ChartLineDown,
  MathOperations: P.MathOperations, Atom: P.Atom, BookOpen: P.BookOpen, GlobeHemisphereWest: P.GlobeHemisphereWest, Translate: P.Translate, Code: P.Code,
  Basketball: P.Basketball, Function: P.Function, PlayCircle: P.PlayCircle, Image: P.Image, PencilSimple: P.PencilSimple, Sun: P.Sun, Flame: P.Fire, Fire: P.Fire,
  ArrowUp: P.ArrowUp, Star: P.Star, Heart: P.Heart, Users: P.Users, Student: P.Student, Book: P.Book, Brain: P.Brain, Medal: P.Medal, Palette: P.Palette,
  MusicNotes: P.MusicNotes, Camera: P.Camera, Flask: P.Flask, SoccerBall: P.SoccerBall, Crown: P.Crown, Rocket: P.Rocket, Leaf: P.Leaf, Cpu: P.Cpu,
};
export function Icon({ name, ...p }: { name: string } & IconProps) {
  const C = map[name] ?? P.Circle;
  return <C {...p} />;
}
export const iconMap = map;
