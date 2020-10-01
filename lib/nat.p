import lib/type.p
import lib/desc.p
import lib/bool.p

def NatD : Desc = Arg \b. if b Ret (Rec Ret)
