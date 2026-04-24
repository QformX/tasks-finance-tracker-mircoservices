import re
import ast
import json

def parse_agent_input(input_val):
    # print(f"Input: {input_val}")
    if isinstance(input_val, dict):
        return input_val
    
    if not isinstance(input_val, str):
        return {}

    input_str = input_val.strip()
    
    # Try JSON
    try:
        return json.loads(input_str)
    except:
        pass
        
    # Try Python dict literal
    try:
        return ast.literal_eval(input_str)
    except:
        pass
    
    # Try parsing key='value' or key="value" patterns
    try:
        # OLD PATTERN
        # pattern = r"(\w+)\s*=\s*(?:['\"]([^'\"]*)['\"]|([^\s,]+))"
        
        # NEW PATTERN: Allow spaces in unquoted values, look for comma or EOS
        pattern = r"(\w+)\s*=\s*(?:['\"]([^'\"]*)['\"]|([^,]+?))(?:\s*,|\s*$)"
        
        matches = re.findall(pattern, input_str)
        if matches:
            result = {}
            for key, val_quoted, val_unquoted in matches:
                val = val_quoted if val_quoted else val_unquoted.strip()
                
                if val_unquoted:
                    if val.lower() == 'true': val = True
                    elif val.lower() == 'false': val = False
                    elif val.lower() == 'none': val = None
                    else:
                        try:
                            if '.' in val: val = float(val)
                            else: val = int(val)
                        except:
                            pass
                            
                result[key] = val
            return result
    except Exception as e:
        print(f"Regex error: {e}")
        pass
        
    return {}

print("--- Test 1: Quoted ---")
test_str = 'user_id = "uuid", title = "Изучить langchain.tool и langgraph"'
print(parse_agent_input(test_str))

print("\n--- Test 2: Unquoted with spaces ---")
test_str_2 = 'user_id = uuid, title = Изучить langchain.tool и langgraph'
print(parse_agent_input(test_str_2))

print("\n--- Test 3: Mixed ---")
test_str_3 = 'user_id = "uuid", title = Изучить langchain.tool, type = tasks'
print(parse_agent_input(test_str_3))

print("\n--- Test 4: Truncation Case (Unquoted) ---")
test_str_4 = 'user_id = "...", title = Изучить langchain.tool и langgraph'
print(parse_agent_input(test_str_4))
