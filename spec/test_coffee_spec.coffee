Calculator = ->
  add: (a,b) -> a + b

describe "Calculator", ->
  calculator = null
  
  beforeEach -> 
    calculator = Calculator()

  describe "add:()->", ->
    it "adds two numbers together", ->
      result = calculator.add 2, 6
      expect(result).toEqual 8
