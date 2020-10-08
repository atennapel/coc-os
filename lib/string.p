import lib/unit.p
import lib/nat.p
import lib/bool.p
import lib/list.p

def Codepoint = Nat
def String = List Codepoint

def Showable = String

def Show = \t. t -> Showable
def show : {t : *} -> Show t -> t -> Showable = \x. x

def instanceShowString : Show String = \s. s
def instanceShowNatUnary : Show Nat = \n. cataNat n (Nil {Nat}) (Cons 49)
def instanceShowUnit : Show U = \_. "()"
def instanceShowBool : Show Bool = \b. if b "True" "False"
def instanceShowList
  : {t : *} -> Show t -> Show (List t)
  = \{t} instanceShow l. cataList l "()" (\h r. appendList (instanceShow h) (appendList " :: " r))
