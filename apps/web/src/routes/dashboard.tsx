import { CobaltButton } from "@cobalt-web/ui/cobalt/button";
import { CobaltCard, cobaltCardChrome } from "@cobalt-web/ui/cobalt/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@cobalt-web/ui/components/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@cobalt-web/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cobalt-web/ui/components/avatar";
import { Badge } from "@cobalt-web/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@cobalt-web/ui/components/breadcrumb";
import { Button } from "@cobalt-web/ui/components/button";
import { ButtonGroup } from "@cobalt-web/ui/components/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@cobalt-web/ui/components/card";
import { Checkbox } from "@cobalt-web/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@cobalt-web/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@cobalt-web/ui/components/hover-card";
import { Input } from "@cobalt-web/ui/components/input";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { Label } from "@cobalt-web/ui/components/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@cobalt-web/ui/components/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cobalt-web/ui/components/popover";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@cobalt-web/ui/components/progress";
import {
  RadioGroup,
  RadioGroupItem,
} from "@cobalt-web/ui/components/radio-group";
import { ScrollArea } from "@cobalt-web/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cobalt-web/ui/components/select";
import { Separator } from "@cobalt-web/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
} from "@cobalt-web/ui/components/sidebar";
import { Skeleton } from "@cobalt-web/ui/components/skeleton";
import { Slider } from "@cobalt-web/ui/components/slider";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { Switch } from "@cobalt-web/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cobalt-web/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cobalt-web/ui/components/tabs";
import { Textarea } from "@cobalt-web/ui/components/textarea";
import { Toggle } from "@cobalt-web/ui/components/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@cobalt-web/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cobalt-web/ui/components/tooltip";
import { cn } from "@cobalt-web/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { SiteHeader } from "@/components/shell/site-header";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function PaletteSwatch({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex h-16 items-center justify-center rounded-lg px-1 text-center font-mono text-[10px] font-medium tracking-tight break-words",
          className
        )}
      >
        {name}
      </div>
      <p className="truncate font-mono text-[10px] text-muted-foreground">
        {name}
      </p>
    </div>
  );
}

function ShowcaseSection({
  title,
  children,
  scratchpadSurface = "cobalt",
}: {
  title: string;
  children: React.ReactNode;
  scratchpadSurface?: "cobalt" | "legacy";
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <div
        className={cn(
          "rounded-xl p-4",
          scratchpadSurface === "cobalt"
            ? cobaltCardChrome
            : "border border-border/80 bg-card/30 ring-1 ring-foreground/5"
        )}
      >
        {children}
      </div>
    </section>
  );
}

function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="relative flex flex-1 flex-col gap-10 overflow-auto p-4 lg:p-6">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">
              Component scratchpad
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Live samples from `@cobalt-web/ui/components/*` — tweak the source
              files in `packages/ui/src/components/` and refresh to iterate on
              the redesign.
            </p>
          </div>

          <ShowcaseSection title="Color palette">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Semantic
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  <PaletteSwatch
                    className="border border-border bg-background text-foreground"
                    name="background"
                  />
                  <PaletteSwatch
                    className="bg-foreground text-background"
                    name="foreground"
                  />
                  <PaletteSwatch
                    className="border border-border/50 bg-card text-card-foreground"
                    name="card"
                  />
                  <PaletteSwatch
                    className="border border-border/50 bg-popover text-popover-foreground"
                    name="popover"
                  />
                  <PaletteSwatch
                    className="bg-primary text-primary-foreground"
                    name="primary"
                  />
                  <PaletteSwatch
                    className="bg-secondary text-secondary-foreground"
                    name="secondary"
                  />
                  <PaletteSwatch
                    className="bg-muted text-muted-foreground"
                    name="muted"
                  />
                  <PaletteSwatch
                    className="bg-accent text-accent-foreground"
                    name="accent"
                  />
                  <PaletteSwatch
                    className="bg-destructive text-white"
                    name="destructive"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Chrome
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  <PaletteSwatch
                    className="border-2 border-border bg-background text-muted-foreground"
                    name="border"
                  />
                  <PaletteSwatch
                    className="border border-border bg-input text-foreground"
                    name="input"
                  />
                  <div className="space-y-1.5">
                    <div className="flex h-16 items-center justify-center rounded-lg bg-background font-mono text-[10px] font-medium tracking-tight text-muted-foreground ring-2 ring-ring ring-offset-2 ring-offset-background">
                      ring
                    </div>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      ring
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Charts
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5">
                  <PaletteSwatch
                    className="bg-chart-1 text-foreground"
                    name="chart-1"
                  />
                  <PaletteSwatch
                    className="bg-chart-2 text-white"
                    name="chart-2"
                  />
                  <PaletteSwatch
                    className="bg-chart-3 text-white"
                    name="chart-3"
                  />
                  <PaletteSwatch
                    className="bg-chart-4 text-white"
                    name="chart-4"
                  />
                  <PaletteSwatch
                    className="bg-chart-5 text-white"
                    name="chart-5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Sidebar
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  <PaletteSwatch
                    className="bg-sidebar text-sidebar-foreground"
                    name="sidebar"
                  />
                  <PaletteSwatch
                    className="bg-sidebar-primary text-sidebar-primary-foreground"
                    name="sidebar-primary"
                  />
                  <PaletteSwatch
                    className="bg-sidebar-accent text-sidebar-accent-foreground"
                    name="sidebar-accent"
                  />
                  <PaletteSwatch
                    className="border border-sidebar-border bg-sidebar-inset text-foreground"
                    name="sidebar-inset"
                  />
                </div>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection title="Button · Badge · Kbd">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Base
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button">Default</Button>
                  <Button type="button" variant="secondary">
                    Secondary
                  </Button>
                  <Button type="button" variant="outline">
                    Outline
                  </Button>
                  <Button type="button" variant="ghost">
                    Ghost
                  </Button>
                  <Button type="button" variant="destructive">
                    Destructive
                  </Button>
                  <Button disabled type="button">
                    Disabled
                  </Button>
                  <Button size="sm" type="button">
                    Small
                  </Button>
                  <Button size="lg" type="button">
                    Large
                  </Button>
                  <Badge>Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                  </KbdGroup>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Cobalt
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <CobaltButton type="button">Default</CobaltButton>
                  <CobaltButton type="button" variant="secondary">
                    Secondary
                  </CobaltButton>
                  <CobaltButton type="button" variant="outline">
                    Outline
                  </CobaltButton>
                  <CobaltButton type="button" variant="ghost">
                    Ghost
                  </CobaltButton>
                  <CobaltButton type="button" variant="destructive">
                    Destructive
                  </CobaltButton>
                  <CobaltButton disabled type="button">
                    Disabled
                  </CobaltButton>
                  <CobaltButton size="sm" type="button">
                    Small
                  </CobaltButton>
                  <CobaltButton size="lg" type="button">
                    Large
                  </CobaltButton>
                  <Badge>Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                  </KbdGroup>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Base
                </p>
                <div className="flex flex-wrap gap-2">
                  <ButtonGroup>
                    <Button size="sm" type="button" variant="outline">
                      Left
                    </Button>
                    <Button size="sm" type="button" variant="outline">
                      Middle
                    </Button>
                    <Button size="sm" type="button" variant="outline">
                      Right
                    </Button>
                  </ButtonGroup>
                  <Toggle aria-label="Bold" size="sm" variant="outline">
                    B
                  </Toggle>
                  <ToggleGroup
                    defaultValue={["left"]}
                    spacing={0}
                    variant="outline"
                  >
                    <ToggleGroupItem aria-label="Left" size="sm" value="left">
                      L
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      aria-label="Center"
                      size="sm"
                      value="center"
                    >
                      C
                    </ToggleGroupItem>
                    <ToggleGroupItem aria-label="Right" size="sm" value="right">
                      R
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  Cobalt
                </p>
                <div className="flex flex-wrap gap-2">
                  <ButtonGroup>
                    <CobaltButton size="sm" type="button" variant="outline">
                      Left
                    </CobaltButton>
                    <CobaltButton size="sm" type="button" variant="outline">
                      Middle
                    </CobaltButton>
                    <CobaltButton size="sm" type="button" variant="outline">
                      Right
                    </CobaltButton>
                  </ButtonGroup>
                  <Toggle aria-label="Bold" size="sm" variant="outline">
                    B
                  </Toggle>
                  <ToggleGroup
                    defaultValue={["left"]}
                    spacing={0}
                    variant="outline"
                  >
                    <ToggleGroupItem aria-label="Left" size="sm" value="left">
                      L
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      aria-label="Center"
                      size="sm"
                      value="center"
                    >
                      C
                    </ToggleGroupItem>
                    <ToggleGroupItem aria-label="Right" size="sm" value="right">
                      R
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection title="Form · Field primitives">
            <div className="grid max-w-xl gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dash-input">Input</Label>
                <Input id="dash-input" placeholder="Placeholder…" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dash-textarea">Textarea</Label>
                <Textarea
                  id="dash-textarea"
                  placeholder="Multiple lines…"
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox defaultChecked id="dash-cb" />
                  <Label htmlFor="dash-cb">Checkbox</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked id="dash-sw" />
                  <Label htmlFor="dash-sw">Switch</Label>
                </div>
              </div>
              <RadioGroup className="gap-2" defaultValue="one">
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="r1" value="one" />
                  <Label htmlFor="r1">Option one</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="r2" value="two" />
                  <Label htmlFor="r2">Option two</Label>
                </div>
              </RadioGroup>
              <div className="grid gap-2">
                <Label htmlFor="dash-select">Select</Label>
                <Select defaultValue="apple">
                  <SelectTrigger className="w-full max-w-xs" id="dash-select">
                    <SelectValue placeholder="Pick a fruit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Slider</Label>
                <Slider defaultValue={[42]} max={100} step={1} />
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection title="Feedback">
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Alert</AlertTitle>
                <AlertDescription>
                  Default alert — adjust `alert.tsx` for border radius and tone.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Destructive</AlertTitle>
                <AlertDescription>
                  Error or destructive context.
                </AlertDescription>
              </Alert>
              <Progress value={0.62}>
                <div className="flex w-full items-center justify-between gap-2">
                  <ProgressLabel>Progress</ProgressLabel>
                  <ProgressValue />
                </div>
              </Progress>
              <div className="flex items-center gap-3">
                <Spinner />
                <span className="text-sm text-muted-foreground">Spinner</span>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection title="Tabs · Accordion · Collapsible">
            <Tabs className="w-full max-w-lg" defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">Account</TabsTrigger>
                <TabsTrigger value="tab2">Password</TabsTrigger>
                <TabsTrigger value="tab3">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">
                <p className="text-sm text-muted-foreground">
                  Tab one content.
                </p>
              </TabsContent>
              <TabsContent value="tab2">
                <p className="text-sm text-muted-foreground">
                  Tab two content.
                </p>
              </TabsContent>
              <TabsContent value="tab3">
                <p className="text-sm text-muted-foreground">
                  Tab three content.
                </p>
              </TabsContent>
            </Tabs>
            <Accordion className="mt-4 max-w-lg" defaultValue={["a1"]}>
              <AccordionItem value="a1">
                <AccordionTrigger>Accordion item one</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Panel content for the first item.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="a2">
                <AccordionTrigger>Accordion item two</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">Second panel.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Collapsible className="mt-4 max-w-lg">
              <CollapsibleTrigger render={<Button variant="outline" />}>
                Toggle collapsible
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                Hidden until expanded.
              </CollapsibleContent>
            </Collapsible>
          </ShowcaseSection>

          <ShowcaseSection title="Navigation · Pagination · Breadcrumb">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Scratchpad</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Pagination className="mt-4 w-full justify-start">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    2
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </ShowcaseSection>

          <ShowcaseSection title="Overlays · Tooltip · Menus">
            <div className="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" />}>
                  Tooltip
                </TooltipTrigger>
                <TooltipContent>Helpful hint text</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  Dropdown
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>
                  Popover
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm text-muted-foreground">
                    Popover body — width and shadow from `popover.tsx`.
                  </p>
                </PopoverContent>
              </Popover>
              <HoverCard>
                <HoverCardTrigger render={<Button variant="outline" />}>
                  Hover card
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-sm text-muted-foreground">
                    Preview content on hover.
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
          </ShowcaseSection>

          <ShowcaseSection scratchpadSurface="legacy" title="Card · Separator">
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                    Base
                  </p>
                  <Card>
                    <CardHeader>
                      <CardTitle>Card</CardTitle>
                      <CardDescription>
                        `card.tsx` — header, description, content, footer.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Body text using theme tokens.
                      </p>
                    </CardContent>
                    <CardFooter className="border-t">
                      <span className="text-xs text-muted-foreground">
                        Footer
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Tag
                      </Badge>
                    </CardFooter>
                  </Card>
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                    Cobalt
                  </p>
                  <CobaltCard>
                    <CardHeader>
                      <CardTitle>Card</CardTitle>
                      <CardDescription>
                        `cobalt/card` — same structure, glass + border chrome.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Body text using theme tokens.
                      </p>
                    </CardContent>
                    <CardFooter className="border-t">
                      <span className="text-xs text-muted-foreground">
                        Footer
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Tag
                      </Badge>
                    </CardFooter>
                  </CobaltCard>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <span className="text-sm text-muted-foreground">Separator</span>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <span>Left</span>
                  <Separator className="flex-1" orientation="vertical" />
                  <span>Right</span>
                </div>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection title="Table · Scroll area · Avatar">
            <div className="grid gap-6 lg:grid-cols-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-end">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Ada</TableCell>
                    <TableCell className="text-end">Admin</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Grace</TableCell>
                    <TableCell className="text-end">Editor</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">
                  ScrollArea (fixed height)
                </span>
                <ScrollArea className="h-32 rounded-lg border border-border/60 p-2">
                  <ul className="space-y-2 pr-3 text-sm">
                    {Array.from({ length: 12 }, (_, i) => (
                      <li key={i}>Scrollable line {i + 1}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
              <div className="flex items-center gap-3 lg:col-span-2">
                <Avatar>
                  <AvatarImage alt="User" src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="bg-muted text-xs">
                    SK
                  </AvatarFallback>
                </Avatar>
                <Avatar size="lg">
                  <AvatarFallback>LG</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </ShowcaseSection>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
