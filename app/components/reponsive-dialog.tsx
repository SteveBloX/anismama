import { useMediaQuery } from "~/hooks/use-media-query"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import { DialogClose } from "@radix-ui/react-dialog";

export function ResponsiveDialog({danger,title, description="", children, open, setOpen, submitText="Valider", onSubmit=()=>null}: {danger:boolean;submitText:string;onSubmit:(..._:any[])=>void;open:boolean;setOpen:(_:boolean)=>void;title: string;description: string;children: JSX.Element|string}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {/*<DialogTrigger asChild>
          <Button variant="outline">Edit Profile</Button>
        </DialogTrigger>*/}
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (<DialogDescription>
              {description}
            </DialogDescription>)}
          </DialogHeader>
          {children}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button>Annuler</Button>
            </DialogClose>
          <Button onClick={onSubmit} variant={danger ? "destructive" : "default"}>
            {submitText}
          </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/*<DrawerTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DrawerTrigger>*/}
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="mx-4">{children}</div>
        <DrawerFooter className="pt-2">
            <Button onClick={onSubmit} variant={danger ? "destructive" : "default"}>
                {submitText}
            </Button>
          <DrawerClose asChild>
            <Button variant="outline">Annuler</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )}